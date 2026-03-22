import packageJson from "../../package.json";

const dependances = {
  "Next.js": packageJson.dependencies.next,
  React: packageJson.dependencies.react,
  Prisma: packageJson.dependencies.prisma,
  Mantine: packageJson.dependencies["@mantine/core"],
  MapLibre: packageJson.dependencies["maplibre-gl"],
  Recharts: packageJson.dependencies.recharts,
};

export function Footer() {
  return (
    <footer className="app-footer">
      <span className="app-footer-version">
        Sillage v{packageJson.version}
      </span>
      <span className="app-footer-deps">
        {Object.entries(dependances).map(([nom, version]) => (
          <span key={nom} className="app-footer-dep">
            {nom} {version?.replace(/^\^/, "")}
          </span>
        ))}
      </span>
    </footer>
  );
}
