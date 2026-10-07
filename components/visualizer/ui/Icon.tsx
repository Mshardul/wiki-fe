// Sprite icon from the app-wide sprite (app/layout.tsx); name is the id without the "icon-" prefix.
export function Icon({ name }: { name: string }) {
  return (
    <svg className="icon" aria-hidden="true">
      <use href={`#icon-${name}`} />
    </svg>
  );
}
