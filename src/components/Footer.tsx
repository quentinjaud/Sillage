import packageJson from "../../package.json";

const deps = {
  "Next.js": packageJson.dependencies.next,
  React: packageJson.dependencies.react,
  Prisma: packageJson.dependencies.prisma,
  Mantine: packageJson.dependencies["@mantine/core"],
  Leaflet: packageJson.dependencies.leaflet,
  Recharts: packageJson.dependencies.recharts,
};

export function Footer() {
  return (
    <footer className="app-footer">
      <span className="app-footer-version">
        Navimeter v{packageJson.version}
      </span>
      <span className="app-footer-deps">
        {Object.entries(deps).map(([name, version]) => (
          <span key={name} className="app-footer-dep">
            {name} {version}
          </span>
        ))}
      </span>
    </footer>
  );
}
