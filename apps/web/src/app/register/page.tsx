import RegisterClient from "./RegisterClient";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RegisterPage({ searchParams }: Props) {
  const params = (await searchParams) ?? {};
  const plan = typeof params.plan === "string" ? params.plan : null;
  const origin = typeof params.origin === "string" ? params.origin : null;

  return <RegisterClient initialPlan={plan} initialOrigin={origin} />;
}
