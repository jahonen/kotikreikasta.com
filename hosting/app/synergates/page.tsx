import type { Metadata } from "next";
import NavBar from "../../components/nav-bar";
import Footer from "../../components/Footer";
import styles from './synergates.module.scss';

export const metadata: Metadata = { 
  title: "Για Συνεργάτες — Kotikreikasta",
  description: "Συνεργαστείτε με την Kotikreikasta και αποκτήστε πρόσβαση στη φινλανδική αγορά ακινήτων. Αποκλειστική περιοχή, αποφασισμένοι αγοραστές, χωρίς δέσμευση αποκλειστικότητας.",
  keywords: [
    "συνεργασία ακινήτων",
    "φινλανδική αγορά",
    "real estate partnership Greece",
    "Finnish buyers Greece",
    "συνεργάτες ακινήτων Ελλάδα",
    "exclusive territory real estate",
    "qualified buyers Finland"
  ],
  alternates: {
    canonical: "https://kotikreikasta.com/synergates"
  },
  openGraph: {
    type: "website",
    locale: "el_GR",
    url: "https://kotikreikasta.com/synergates",
    siteName: "Kotikreikasta.com",
    title: "Για Συνεργάτες — Kotikreikasta",
    description: "Συνεργαστείτε με την Kotikreikasta και αποκτήστε πρόσβαση στη φινλανδική αγορά ακινήτων. Αποκλειστική περιοχή, αποφασισμένοι αγοραστές, χωρίς δέσμευση αποκλειστικότητας.",
    images: [
      {
        url: "https://kotikreikasta.com/etuovi_kreikkaan.jpg",
        width: 1200,
        height: 630,
        alt: "Kotikreikasta Partnership Program"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    site: "@kotikreikasta",
    creator: "@kotikreikasta",
    title: "Για Συνεργάτες — Kotikreikasta",
    description: "Συνεργαστείτε με την Kotikreikasta και αποκτήστε πρόσβαση στη φινλανδική αγορά ακινήτων.",
    images: ["https://kotikreikasta.com/etuovi_kreikkaan.jpg"]
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function SynergatesPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Για Συνεργάτες — Kotikreikasta",
    "description": "Συνεργαστείτε με την Kotikreikasta και αποκτήστε πρόσβαση στη φινλανδική αγορά ακινήτων. Αποκλειστική περιοχή, αποφασισμένοι αγοραστές, χωρίς δέσμευση αποκλειστικότητας.",
    "url": "https://kotikreikasta.com/synergates",
    "inLanguage": "el",
    "isPartOf": {
      "@type": "WebSite",
      "name": "Kotikreikasta.com",
      "url": "https://kotikreikasta.com"
    },
    "about": {
      "@type": "Service",
      "name": "Real Estate Partnership Program",
      "provider": {
        "@type": "RealEstateAgent",
        "name": "Kotikreikasta.com",
        "url": "https://kotikreikasta.com",
        "email": "anna@kotikreikasta.com",
        "areaServed": {
          "@type": "Country",
          "name": "Greece"
        }
      },
      "serviceType": "Real Estate Partnership",
      "audience": {
        "@type": "Audience",
        "audienceType": "Greek Real Estate Professionals"
      }
    },
    "mainEntity": {
      "@type": "Offer",
      "name": "Exclusive Territory Partnership",
      "description": "Partnership program providing access to qualified Finnish buyers seeking Greek properties",
      "offeredBy": {
        "@type": "Organization",
        "name": "Kotikreikasta.com"
      }
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <NavBar />
      <main className={styles.partnersPage}>
        <div className={styles.hero}>
          <div className="container">
            <span className={styles.label}>Για Επαγγελματίες</span>
            <h1 className={styles.title}>Για Συνεργάτες</h1>
            <p className={styles.lead}>
              Η φινλανδική αγορά αποτελεί μία από τις πλέον ώριμες και σταθερές πηγές ζήτησης για ελληνικά ακίνητα στη Βόρεια Ευρώπη.
            </p>
          </div>
        </div>

        <div className={styles.content}>
          <div className="container">
            <section className={styles.intro}>
              <p>
                Με περισσότερα από 10 χρόνια εμπειρίας στον φινλανδικό κλάδο ακινήτων, η Kotikreikasta διαθέτει την τεχνογνωσία και το δίκτυο που απαιτούνται για την αποτελεσματική προσέγγιση αυτής της αγοράς. Σήμερα, επεκτείνουμε τη δραστηριότητά μας στην Ελλάδα και αναζητούμε επιλεγμένους συνεργάτες που επιθυμούν να αξιοποιήσουν αυτή την ευκαιρία.
              </p>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionNumber}>01</span>
                <h2>Το Μοντέλο Συνεργασίας</h2>
              </div>
              <div className={styles.sectionContent}>
                <p>
                  Η Kotikreikasta αναλαμβάνει την πλήρη διαχείριση του κύκλου απόκτησης πελατών: εντοπισμός, αξιολόγηση και συστηματική καλλιέργεια υποψήφιων αγοραστών μέσω ολοκληρωμένης διαδικασίας στη φινλανδική γλώσσα. Ο συνεργάτης μας αναλαμβάνει την ολοκλήρωση της συναλλαγής επί τόπου. Η Kotikreikasta παρέχει υποστήριξη μετά την πώληση απευθείας στον αγοραστή, διασφαλίζοντας την ποιότητα της εμπειρίας και τη μακροχρόνια σχέση εμπιστοσύνης.
                </p>
                <p>
                  Κάθε συναλλαγή διεκπεραιώνεται μέσω Έλληνα δικηγόρου, διασφαλίζοντας πλήρη συμμόρφωση με την ελληνική νομοθεσία και προστατεύοντας τα συμφέροντα όλων των εμπλεκόμενων μερών.
                </p>
                <div className={styles.highlight}>
                  <p>
                    <strong>Με άλλα λόγια:</strong> εμείς φέρνουμε τον αποφασισμένο αγοραστή, εσείς κλείνετε τη συμφωνία.
                  </p>
                </div>
              </div>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionNumber}>02</span>
                <h2>Όροι Συνεργασίας</h2>
              </div>
              <div className={styles.sectionContent}>
                <p>
                  Η Kotikreikasta επιλέγει έναν μόνο συνεργάτη ανά περιοχή, δεσμευόμενη να κατευθύνει το σύνολο της φινλανδικής της πελατείας αποκλειστικά σε αυτόν για τη συγκεκριμένη τοποθεσία. Η δέσμευση αυτή είναι μονομερής: δεν απαιτούμε αποκλειστικότητα από τον συνεργάτη μας. Η υφιστάμενη λειτουργία, η πελατειακή βάση και οι εμπορικές σχέσεις του συνεργάτη στην ελληνική αγορά παραμένουν αναλλοίωτες.
                </p>
                <p>
                  Ζητούμε ένα και μόνο: πρόσβαση στα επιλεγμένα ακίνητά του και δέσμευση για την ποιότητα της εξυπηρέτησης κατά τη φάση της συναλλαγής.
                </p>
              </div>
            </section>

            <section className={styles.contact}>
              <div className={styles.contactCard}>
                <span className={styles.sectionNumber}>03</span>
                <h2>Επικοινωνία</h2>
                <p>
                  Για περισσότερες πληροφορίες σχετικά με τη συνεργασία, παρακαλούμε επικοινωνήστε με την υπεύθυνη συνεργασιών μας.
                </p>
                <span
                  dangerouslySetInnerHTML={{
                    __html: `<!--email_off--><a class="${styles.contactButton}" href="mailto:anna@kotikreikasta.com">anna@kotikreikasta.com</a><!--/email_off-->`,
                  }}
                />
              </div>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
