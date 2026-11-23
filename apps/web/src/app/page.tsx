import { redirect } from "next/navigation";
import { routes } from "@/lib/routes";

/** The app root opens the Overview. */
export default function Page() {
	redirect(routes.OVERVIEW);
}
