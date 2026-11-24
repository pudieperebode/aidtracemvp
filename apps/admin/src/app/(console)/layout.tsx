import { AdminShell } from "@/components/layouts/AdminShell";

/** Every console screen: the shell and the platform-admin gate. */
export default function Layout({ children }: { children: React.ReactNode }) {
	return <AdminShell>{children}</AdminShell>;
}
