import { AppShell } from "@/components/layouts/AppShell";

/** Every app screen sits in the design's shell: header, sidebar (drawer on small screens), sign-in dialog. */
export default function Layout({ children }: { children: React.ReactNode }) {
	return <AppShell>{children}</AppShell>;
}
