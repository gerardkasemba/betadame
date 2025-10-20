import LoginForm from './LoginForm'

interface PageProps {
  searchParams: { [key: string]: string | string[] | undefined }
}

export default function LoginPage({ searchParams }: PageProps) {
  return <LoginForm searchParams={searchParams} />
}