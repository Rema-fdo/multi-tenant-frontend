import Link from 'next/link';

const areas = [
  {
    href: '/super-admin',
    badge: 'SA',
    title: 'Super Admin',
    blurb: 'Log in with the operator account and create organizations.',
  },
  {
    href: '/admin',
    badge: 'OA',
    title: 'Organization Admin',
    blurb: "Sign up or log in, then manage your organization's feature flags.",
  },
  {
    href: '/user',
    badge: 'EU',
    title: 'End User',
    blurb: 'Check whether a feature is enabled for your organization.',
  },
];

export default function Home() {
  return (
    <>
      <div className="page-header home-intro">
        <h1>Feature Flag Management</h1>
        <p>Pick the area that matches your role.</p>
      </div>
      <nav className="home-links">
        {areas.map((area) => (
          <Link key={area.href} href={area.href} className="role-card">
            <span className="role-badge">{area.badge}</span>
            <span className="role-text">
              <strong>{area.title}</strong>
              <span>{area.blurb}</span>
            </span>
            <span className="role-arrow" aria-hidden="true">
              &rarr;
            </span>
          </Link>
        ))}
      </nav>
    </>
  );
}
