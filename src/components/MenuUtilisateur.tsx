"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useSession, signOut } from "@/lib/auth-client";
import { Menu, UnstyledButton } from "@mantine/core";

export function MenuUtilisateur() {
  const routeur = useRouter();
  const pathname = usePathname();
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <div className="app-header-user" />;
  }

  if (!session) {
    return (
      <div className="app-header-user">
        <div className="app-header-user-links">
          <Link href="/connexion" className="app-header-user-link">
            Connexion
          </Link>
          <Link href="/inscription" className="app-header-user-link">
            Inscription
          </Link>
        </div>
      </div>
    );
  }

  const estAdmin = session.user.role === "admin";

  return (
    <>
      <nav className="app-header-nav">
        <Link
          href="/journal"
          className={`app-header-nav-link ${pathname === "/journal" ? "active" : ""}`}
        >
          Journal
        </Link>
        {estAdmin && (
          <Link
            href="/admin"
            className={`app-header-nav-link ${pathname.startsWith("/admin") ? "active" : ""}`}
          >
            Admin
          </Link>
        )}
      </nav>
      <div className="app-header-spacer" />
      <div className="app-header-user">
        <Menu shadow="md" width={200} position="bottom-end">
          <Menu.Target>
            <UnstyledButton className="app-header-user-menu-btn">
              {session.user.name} ▾
            </UnstyledButton>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item component={Link} href="/traces">
              Mes traces
            </Menu.Item>
            <Menu.Item component={Link} href="/bateaux">
              Mes bateaux
            </Menu.Item>
            <Menu.Divider />
            <Menu.Item
              color="red"
              onClick={async () => {
                await signOut();
                routeur.push("/");
              }}
            >
              Deconnexion
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </div>
    </>
  );
}
