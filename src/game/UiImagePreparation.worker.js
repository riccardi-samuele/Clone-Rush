// Decode and pad the original artwork away from the page's animation thread.
// One job at a time bounds peak bitmap/canvas memory during startup.
let queue = Promise.resolve();

self.onmessage = ({ data: { id, blob } }) => {
  queue = queue.then(async () => {
    let image;
    try {
      image = await createImageBitmap(blob);
      const width = image.width, height = image.height;
      const canvas = new OffscreenCanvas(2 ** Math.ceil(Math.log2(width)),
        2 ** Math.ceil(Math.log2(height)));
      canvas.getContext('2d', { willReadFrequently: true }).drawImage(image, 0, 0);
      image.close();
      image = null;
      const bitmap = canvas.transferToImageBitmap();
      self.postMessage({ id, bitmap, width, height }, [bitmap]);
    } catch (error) {
      image?.close();
      self.postMessage({ id, error: error.message });
    }
  });
};
