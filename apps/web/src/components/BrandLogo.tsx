export function BrandLogo({ className = 'h-10 w-10' }: { className?: string }) {
  return (
    <img
      src="/brand/thesispartner.png"
      alt=""
      aria-hidden="true"
      width={500}
      height={500}
      draggable={false}
      className={`block shrink-0 object-contain ${className}`}
    />
  );
}
