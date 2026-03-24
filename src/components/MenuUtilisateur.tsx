"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "@/lib/auth-client";
import { Menu, UnstyledButton } from "@mantine/core";
import { User, Settings } from "lucide-react";
import { usePanneau } from "@/lib/contexts/PanneauContext";

export function MenuUtilisateur() {
  const routeur = useRouter();
  const { data: session, isPending } = useSession();
  const { ouvrirPanneau } = usePanneau();

  if (isPending || !session) return null;

  const estAdmin = session.user.role === "admin";

  return (
    <div className="bouton-user-wrapper">
      <Menu shadow="md" width={200} position="bottom-end">
        <Menu.Target>
          <UnstyledButton className="bouton-user" title={session.user.name}>
            <User size={18} />
          </UnstyledButton>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Label>{session.user.name}</Menu.Label>
          <Menu.Item onClick={() => ouvrirPanneau("traces")}>
            Mes traces
          </Menu.Item>
          <Menu.Item onClick={() => ouvrirPanneau("bateaux")}>
            Mes bateaux
          </Menu.Item>
          <Menu.Item onClick={() => ouvrirPanneau("preferences")}>
            <Settings size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />
            Preferences
          </Menu.Item>
          {estAdmin && (
            <>
              <Menu.Divider />
              <Menu.Item component={Link} href="/admin">
                Admin
              </Menu.Item>
            </>
          )}
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
  );
}
