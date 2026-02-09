import LoginClient from "./LoginClient";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: Props) {
  const params = (await searchParams) ?? {};
  const plan = typeof params.plan === "string" ? params.plan : null;
  const origin = typeof params.origin === "string" ? params.origin : null;

  return <LoginClient initialPlan={plan} initialOrigin={origin} />;
}
