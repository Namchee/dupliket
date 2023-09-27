function dotProduct(a: number[], b: number[]): number {
  let product = 0;
  for (let idx = 0; idx < Math.min(a.length, b.length); idx++) {
    product += a[idx] * b[idx];
  }

  return product;
}

function magnitude(input: number[]): number {
  return Math.sqrt(
    input.map(num => num * num).reduce((acc, curr) => acc + curr),
  );
}

export function cosineSimilarity(source: number[], target: number[]): number {
  return dotProduct(source, target) / (magnitude(source) * magnitude(target));
}
