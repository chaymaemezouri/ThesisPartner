export function VersionBadge({ versionNumber }: { versionNumber: number }) {
  return (
    <span className="inline-flex items-center rounded-full bg-brand-soft px-2 py-0.5 text-sm font-medium text-brand">
      V{versionNumber}
    </span>
  );
}
