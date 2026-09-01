export function hasGrandpaQuorum(
  signedWeight: bigint,
  totalWeight: bigint
): boolean {
  if (signedWeight < 0n) {
    throw new Error(
      "signed weight cannot be negative"
    );
  }

  if (totalWeight <= 0n) {
    throw new Error(
      "total weight must be positive"
    );
  }

  if (signedWeight > totalWeight) {
    return false;
  }

  return (
    3n * signedWeight >
    2n * totalWeight
  );
}
