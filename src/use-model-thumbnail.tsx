import { useEffect, useState } from "react";
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

export interface UseModelThumbnailProps {
  url?: string;
  fileType?: string;
  color?: string;
}

type ThumbnailState =
  | { status: "idle" }
  | { status: "downloading"; progress: number }
  | { status: "complete"; data: string }
  | { status: "error"; error: string };

async function renderModel(
  url: string,
  fileType: "obj" | "stl",
  color: string,
  width: number,
  height: number,
  onProgress: (progress: number) => void
): Promise<string> {
  const scene = new THREE.Scene();
  scene.background = null;

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
    precision: "highp",
  });

  renderer.setSize(width, height, false);
  renderer.setPixelRatio(1);
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambientLight);

  const mainLight = new THREE.DirectionalLight(0xffffff, 1.5);
  mainLight.position.set(3, 3, 5);
  mainLight.castShadow = true;
  mainLight.shadow.mapSize.width = 1024;
  mainLight.shadow.mapSize.height = 1024;
  mainLight.shadow.camera.near = 0.1;
  mainLight.shadow.camera.far = 100;
  mainLight.shadow.bias = -0.001;
  scene.add(mainLight);

  const fillLight = new THREE.DirectionalLight(0xffffff, 0.8);
  fillLight.position.set(-3, 0, 3);
  fillLight.castShadow = true;
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xffffff, 0.6);
  rimLight.position.set(0, -3, -2);
  rimLight.castShadow = true;
  scene.add(rimLight);

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
  scene.add(hemiLight);

  const loader = fileType === "obj" ? new OBJLoader() : new STLLoader();

  try {
    const result = await new Promise<THREE.Object3D | THREE.BufferGeometry>(
      (resolve, reject) => {
        loader.load(
          url,
          resolve,
          (event) => {
            if (event.lengthComputable) {
              onProgress((event.loaded / event.total) * 100);
            }
          },
          reject
        );
      }
    );

    let model: THREE.Object3D;

    if (result instanceof THREE.BufferGeometry) {
      const material = new THREE.MeshPhysicalMaterial({
        color: parseInt(color.substring(1), 16),
        metalness: 0.0,
        roughness: 0.9,
        envMapIntensity: 0.3,
        clearcoat: 0.0,
        clearcoatRoughness: 1.0,
        flatShading: true,
      });
      model = new THREE.Mesh(result, material);
    } else {
      model = result;
      model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.material = new THREE.MeshPhysicalMaterial({
            color: parseInt(color.substring(1), 16),
            metalness: 0.0,
            roughness: 0.9,
            envMapIntensity: 0.3,
            clearcoat: 0.0,
            clearcoatRoughness: 1.0,
            flatShading: true,
          });
        }
      });
    }

    scene.add(model);

    const bbox = new THREE.Box3().setFromObject(model);
    const size = bbox.getSize(new THREE.Vector3());
    const center = bbox.getCenter(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 1 / maxDim;
    model.scale.multiplyScalar(scale);
    model.position.copy(center).multiplyScalar(-scale);

    const fov = 45;
    const aspect = 1;
    const vFov = (fov * Math.PI) / 180;
    const distance = Math.min(1.7, (1.7 / Math.tan(vFov / 2)) * aspect);
    const cameraDistance = distance;
    const angle = Math.PI / 4;

    camera.position.set(
      -Math.cos(angle) * cameraDistance,
      -Math.cos(angle) * cameraDistance,
      Math.sin(angle) * cameraDistance * 0.5
    );
    camera.up.set(0, 0, 1);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();

    renderer.render(scene, camera);

    return canvas.toDataURL("image/png");
  } finally {
    renderer.dispose();
    scene.clear();
  }
}

export function useModelThumbnail({
  url,
  fileType,
  color = "#808080",
}: UseModelThumbnailProps) {
  const [state, setState] = useState<ThumbnailState>({ status: "idle" });

  useEffect(() => {
    if (!url) return;
    if (fileType !== "obj" && fileType !== "stl") return;

    setState({ status: "downloading", progress: 0 });

    const controller = new AbortController();

    renderModel(url, fileType as "obj" | "stl", color, 400, 400, (progress) => {
      setState({ status: "downloading", progress });
    })
      .then((imageData) => {
        if (!controller.signal.aborted) {
          setState({ status: "complete", data: imageData });
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setState({
            status: "error",
            error:
              error instanceof Error ? error.message : "Failed to render model",
          });
        }
      });

    return () => {
      controller.abort();
    };
  }, [url, fileType, color]);

  return {
    data: state.status === "complete" ? state.data : null,
    loading: state.status === "downloading",
    error: state.status === "error" ? state.error : null,
    progress: state.status === "downloading" ? state.progress : null,
  };
}
