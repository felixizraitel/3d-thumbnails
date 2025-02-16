# @autoquote3d/3d-thumbnail-renderer

A React hook for generating thumbnails from 3D model files (STL and OBJ).

## Installation

```bash
npm install @autoquote3d/3d-thumbnail-renderer
```

## Usage

```tsx
import { useModelThumbnail } from "@autoquote3d/3d-thumbnail-renderer";

function ModelPreview() {
  const file = new File();
  const { thumbnail, loading, error } = useModelThumbnail({
    url: URL.createObjectURL(file), // or some other valid url
    fileType: "stl",
    color: "#808080", // optional, defaults to gray
  });

  if (loading.status !== "complete") {
    return <div>Loading... {loading.progress}%</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return <img src={thumbnail} alt="3D Model Thumbnail" />;
}
```

## Props

- `url`: URL or path to the 3D model file
- `fileType`: Type of the 3D model file ('stl' or 'obj')
- `color`: (Optional) Color of the model in hex format. Defaults to '#808080'

## Return Values

- `thumbnail`: Base64 encoded image data URL
- `loading`: Object containing loading status and progress
- `error`: Error message if something goes wrong

## License

MIT
