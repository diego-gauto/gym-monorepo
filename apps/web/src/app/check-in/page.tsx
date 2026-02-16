import CheckInClient from './CheckInClient';

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CheckInPage({ searchParams }: Props) {
  const params = (await searchParams) ?? {};
  const gym = typeof params.gym === 'string' ? params.gym : null;
  const token = typeof params.t === 'string'
    ? params.t
    : typeof params.token === 'string'
      ? params.token
      : null;

  return <CheckInClient initialGym={gym} initialToken={token} />;
}
