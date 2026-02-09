import LoginClient from "./LoginClient";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: Props) {
  const params = (await searchParams) ?? {};
  const plan = typeof params.plan === "string" ? params.plan : null;
  const next = typeof params.next === "string" ? params.next : null;

  return <LoginClient initialPlan={plan} initialNext={next} />;
}
