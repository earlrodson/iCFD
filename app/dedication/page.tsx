export const metadata = {
  title: 'Dedication & Acknowledgments',
}

export default function DedicationPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-bold text-foreground">Dedication &amp; Acknowledgments</h1>

        <blockquote className="mt-6 border-l-4 border-primary pl-4 italic text-muted-foreground">
          &ldquo;Whatever you do, do everything for the glory of God.&rdquo;
          <footer className="mt-1 text-sm not-italic">— 1 Corinthians 10:31</footer>
        </blockquote>

        <div className="mt-8 space-y-5 text-sm leading-7 text-foreground">
          <p>
            The Catholic Faith Defender application is offered first and foremost for the greater
            glory of God and for the service of His Church. It is a humble contribution toward the
            mission entrusted by Christ to His disciples: to proclaim the Gospel, strengthen the
            faithful, and always be prepared to give a reason for the hope that is within us
            (1 Peter 3:15).
          </p>

          <p>
            With profound gratitude and love, I dedicate this work to my beloved wife, Fiebelle,
            whose unwavering support, patience, encouragement, and sacrifices have made this
            endeavor possible. Her constant prayers and steadfast faith have been a source of
            strength throughout this journey.
          </p>

          <p>Above all, I lovingly entrust and offer this work to the Holy Family:</p>

          <ul className="list-disc space-y-2 pl-5">
            <li>Our Lord Jesus Christ, our Savior and the source of all truth;</li>
            <li>
              The Blessed Virgin Mary, Mother of God and Mother of the Church, whose intercession
              continually leads us closer to her Son;
            </li>
            <li>
              Saint Joseph, Guardian of the Redeemer and Patron of the Universal Church, whose
              example of humility, obedience, and faithful service continues to inspire this
              mission.
            </li>
          </ul>

          <p>
            This work is also dedicated to my spiritual family, the Catholic Faith Defenders –
            Santo Rosario Chapter, Diocese of Davao, whose commitment to evangelization,
            catechesis, and the defense of the Catholic faith has inspired the vision behind this
            application. May this project become a useful instrument in helping Catholics know,
            love, defend, and faithfully live the teachings entrusted by Christ to His Church.
          </p>

          <p>
            Finally, with gratitude to Almighty God, I pray that every line of code, every article,
            every lesson, and every resource found within this application may serve not for
            personal recognition, but for the salvation of souls, the strengthening of the
            faithful, and the greater glory of God.
          </p>

          <p className="text-center font-semibold text-foreground">
            Ad Majorem Dei Gloriam
            <br />
            For the Greater Glory of God.
          </p>

          <p className="italic text-muted-foreground">
            &ldquo;If this application has helped you grow in your knowledge and love of the
            Catholic faith, please remember us in your prayers. May God bless you and keep you
            always faithful to His Holy Church.&rdquo;
          </p>

          <p className="text-right text-foreground">— Bro. Earlrodson Cariño</p>
        </div>
      </div>
    </div>
  )
}
