# @autoquote3d/3d-thumbnail-renderer

See it in action here: https://3d-thumbnail-example.vercel.app/

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
  const { data, loading, error, progress } = useModelThumbnail({
    url: URL.createObjectURL(file), // or some other valid url
    fileType: "stl",
    color: "#808080", // optional, defaults to gray
  });

  if (loading) {
    return <div>Loading... {progress}%</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return <img src={data} alt="3D Model Thumbnail" />;
}
```

## Props

- `url`: URL or path to the 3D model file
- `fileType`: Type of the 3D model file ('stl' or 'obj')
- `color`: (Optional) Color of the model in hex format. Defaults to '#808080'

## Return Values

- `data`: Base64 encoded image data URL when complete
- `loading`: Boolean indicating if the thumbnail is being generated
- `error`: Error message if something goes wrong
- `progress`: Number indicating the download progress percentage

## License

MIT
