import Link from "next/link";import AuthForm from "@/components/AuthForm";
export default function Signup(){return <AuthForm mode="signup" footer={<span>Already have an account? <Link href="/login">Log in</Link></span>}/>}
