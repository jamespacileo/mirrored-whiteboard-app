// Utility function provided in the perfect-freehand README
// https://github.com/steveruizok/perfect-freehand

const average = (a: number, b: number): number => (a + b) / 2;

/**
 * Converts an array of points representing a stroke outline into an SVG path data string.
 *
 * @param {number[][]} points - An array of points [x, y].
 * @param {boolean} [closed=true] - Whether the path should be closed (default: true).
 * @returns {string} - The SVG path data string.
 */
export function getSvgPathFromStroke(points: number[][], closed = true): string {
  const len = points.length;

  if (len < 4) {
    return ``;
  }

  let a = points[0];
  let b = points[1];
  const c = points[2];

  let result = `M${a[0].toFixed(2)},${a[1].toFixed(2)} Q${b[0].toFixed(
    2
  )},${b[1].toFixed(2)} ${average(b[0], c[0]).toFixed(2)},${average(
    b[1],
    c[1]
  ).toFixed(2)} T`;

  for (let i = 2, max = len - 1; i < max; i++) {
    a = points[i];
    b = points[i + 1];
    result += `${average(a[0], b[0]).toFixed(2)},${average(a[1], b[1]).toFixed(
      2
    )} `;
  }

  if (closed) {
    result += 'Z';
  }

  return result;
}