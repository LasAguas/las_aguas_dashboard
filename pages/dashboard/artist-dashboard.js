// pages/dashboard/artist-dashboard.js

export async function getServerSideProps() {
  return {
    redirect: {
      destination: "/dashboard/artist/home",
      permanent: true, // set to false if you want a 307 instead of 308
    },
  };
}

export default function ArtistDashboardRedirect() {
  // This never actually renders because of the redirect,
  // but Next.js expects a default component export.
  return null;
}
