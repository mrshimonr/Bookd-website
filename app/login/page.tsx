import Link from "next/link";import AuthForm from "@/components/AuthForm";
export default function Login(){return <AuthForm mode="login" footer={<span>New to Bookd? <Link href="/signup">Create an account</Link></span>}/>}
