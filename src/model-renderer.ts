import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

interface RenderMessage {
  url: string;
  fileType: "obj" | "stl";
  color: string;
  width: number;
  height: number;
}

// Convert blob to base64
async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return `data:${blob.type};base64,${btoa(binary)}`;
}

const renderModel = async (data: RenderMessage) => {
  const { url, fileType, color, width, height } = data;

  const scene = new THREE.Scene();
  scene.background = null;

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);

  // Create an OffscreenCanvas
  const canvas = new OffscreenCanvas(width, height);
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
    precision: "highp",
  });

  renderer.setSize(width, height, false); // false to prevent setting canvas style
  renderer.setPixelRatio(1); // Use 1 for workers
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Lighting
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

  // Load model
  const loader = fileType === "obj" ? new OBJLoader() : new STLLoader();

  try {
    const result = await new Promise<THREE.Object3D | THREE.BufferGeometry>(
      (resolve, reject) => {
        loader.load(
          url,
          resolve,
          (event) => {
            if (event.lengthComputable) {
              const progress = (event.loaded / event.total) * 100;
              postMessage({ type: "progress", progress });
            }
          },
          reject,
        );
      },
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

    // Center and scale model
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
      Math.sin(angle) * cameraDistance * 0.5,
    );
    camera.up.set(0, 0, 1);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();

    renderer.render(scene, camera);

    // Convert the OffscreenCanvas to a blob
    const blob = await canvas.convertToBlob({
      type: "image/png",
      quality: 1,
    });

    // Convert blob to base64 using our custom function
    const imageData = await blobToBase64(blob);

    postMessage({ type: "complete", imageData });
  } catch (error) {
    postMessage({
      type: "error",
      error: error instanceof Error ? error.message : "Failed to render model",
    });
  } finally {
    renderer.dispose();
    scene.clear();
  }
};

addEventListener("message", (event: MessageEvent<RenderMessage>) => {
  renderModel(event.data);
});
