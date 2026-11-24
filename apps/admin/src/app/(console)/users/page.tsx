import type { Metadata } from "next";
import { Users } from "@/features/users/components/Users";

export const metadata: Metadata = { title: "Users" };

export default function Page() {
	return <Users />;
}
