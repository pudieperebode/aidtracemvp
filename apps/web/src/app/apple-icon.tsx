import { ImageResponse } from "next/og";
import { IconMark } from "@repo/ui/og-card";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon: the AidTrace mark. */
export default function AppleIcon() {
	return new ImageResponse(<IconMark size={180} />, size);
}
