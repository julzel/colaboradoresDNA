import Link from "next/link";

import { Container } from "@/components/ui/container/container";
import { StackCard } from "@/features/system/components/stack-card/stack-card";
import { stackItems } from "@/features/system/data/stack-items";

export default function HomePage() {
  return (
    <>
      <header className="site-header">
        <Container className="site-header__inner">
          <Link className="brand" href="/" aria-label="Colaboradores DNA home">
            <span className="brand__mark" aria-hidden="true">
              DNA
            </span>
            <span>Colaboradores</span>
          </Link>
          <span className="status-pill">
            <span className="status-pill__dot" aria-hidden="true" />
            Foundation ready
          </span>
        </Container>
      </header>

      <main id="main-content">
        <section className="hero" aria-labelledby="hero-title">
          <Container>
            <p className="eyebrow">Technical foundation · 2026</p>
            <h1 id="hero-title">
              Built light.
              <br />
              Ready to grow.
            </h1>
            <p className="hero__lede">
              The Colaboradores DNA workspace is running on a modern, accessible
              full-stack architecture designed for Netlify and MongoDB Atlas.
            </p>
            <div className="hero__actions">
              <a className="button button--primary" href="#architecture">
                Explore the architecture
              </a>
              <a className="button button--secondary" href="/api/health">
                Check API health
              </a>
            </div>
          </Container>
        </section>

        <section
          className="architecture"
          id="architecture"
          aria-labelledby="architecture-title"
        >
          <Container>
            <div className="section-heading">
              <div>
                <p className="eyebrow">System overview</p>
                <h2 id="architecture-title">A focused stack, end to end.</h2>
              </div>
              <p>
                Each layer has a clear job, keeping the application easier to test,
                scale, and maintain.
              </p>
            </div>

            <div className="stack-grid">
              {stackItems.map((item, index) => (
                <StackCard item={item} index={index + 1} key={item.title} />
              ))}
            </div>
          </Container>
        </section>

        <section className="principles" aria-labelledby="principles-title">
          <Container className="principles__layout">
            <div>
              <p className="eyebrow eyebrow--light">Delivery principles</p>
              <h2 id="principles-title">Quality is part of the architecture.</h2>
            </div>
            <ul className="principles__list">
              <li>
                <span>01</span>
                Server-first rendering with minimal browser JavaScript
              </li>
              <li>
                <span>02</span>
                Responsive native CSS with accessible interaction patterns
              </li>
              <li>
                <span>03</span>
                Typed, validated boundaries from the interface to the database
              </li>
            </ul>
          </Container>
        </section>
      </main>

      <footer>
        <Container className="footer__inner">
          <span>Colaboradores DNA</span>
          <span>Next.js · Netlify · MongoDB Atlas</span>
        </Container>
      </footer>
    </>
  );
}
