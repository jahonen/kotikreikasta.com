import NavBar from "../../components/nav-bar";
import Footer from "../../components/Footer";
import styles from './synergates.module.scss';

export const metadata = { 
  title: "Για Συνεργάτες — Kotikreikasta",
  description: "Συνεργαστείτε με την Kotikreikasta και αποκτήστε πρόσβαση στη φινλανδική αγορά ακινήτων"
};

export default function SynergatesPage() {
  return (
    <>
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
                <a href="mailto:anna@kotikreikasta.com" className={styles.contactButton}>
                  anna@kotikreikasta.com
                </a>
              </div>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
