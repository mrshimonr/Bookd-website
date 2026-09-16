import type { Metadata } from "next";
import "./globals.css";
import "./auth.css";
export const metadata: Metadata = { title: "Bookd — Your business. Your website. Your bookings.", description: "The customizable all-in-one booking platform for modern businesses." };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
