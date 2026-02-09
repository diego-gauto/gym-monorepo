import RegisterClient from "./RegisterClient";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RegisterPage({ searchParams }: Props) {
  const params = (await searchParams) ?? {};
  const plan = typeof params.plan === "string" ? params.plan : null;
  const next = typeof params.next === "string" ? params.next : null;

  return <RegisterClient initialPlan={plan} initialNext={next} />;
}
