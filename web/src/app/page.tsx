import Link from "next/link";

import { Button, ButtonLink } from "@/components/ui/button/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card/card";
import {
  CheckboxField,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/ui/form-field/form-field";
import { Breadcrumbs } from "@/components/ui/navigation/breadcrumbs";
import {
  SideNavigation,
  type NavigationItem,
} from "@/components/ui/navigation/side-navigation";
import { StatusBadge } from "@/components/ui/status-badge/status-badge";
import { ThemeToggle } from "@/components/ui/theme-toggle/theme-toggle";

import styles from "./page.module.css";

const navigationItems: readonly NavigationItem[] = [
  { href: "/", label: "Overview", marker: "OV" },
  { href: "#collaborators", label: "Collaborators", marker: "CO" },
  { href: "#processes", label: "Processes", marker: "PR", badge: "8" },
  { href: "#documents", label: "Documents", marker: "DO" },
  { href: "#reports", label: "Reports", marker: "RE" },
  { href: "#design-system", label: "Design system", marker: "DS" },
];

const metrics = [
  {
    detail: "4 joined this month",
    label: "Active collaborators",
    status: "Healthy",
    tone: "success" as const,
    value: "128",
  },
  {
    detail: "Across 5 operating areas",
    label: "Open processes",
    status: "In progress",
    tone: "info" as const,
    value: "24",
  },
  {
    detail: "Needs an owner this week",
    label: "Pending reviews",
    status: "Attention",
    tone: "warning" as const,
    value: "8",
  },
  {
    detail: "Up 6 points from June",
    label: "On-time completion",
    status: "On target",
    tone: "success" as const,
    value: "92%",
  },
];

const recentProcesses = [
  {
    initials: "AM",
    name: "Ana Mora",
    owner: "People Operations",
    process: "Onboarding",
    status: "In progress",
    tone: "info" as const,
    updated: "12 min ago",
  },
  {
    initials: "DL",
    name: "Diego López",
    owner: "Legal",
    process: "Contract renewal",
    status: "Needs review",
    tone: "warning" as const,
    updated: "1 hr ago",
  },
  {
    initials: "SR",
    name: "Sofía Rojas",
    owner: "Finance",
    process: "Expense setup",
    status: "Complete",
    tone: "success" as const,
    updated: "Yesterday",
  },
  {
    initials: "JC",
    name: "José Castro",
    owner: "People Operations",
    process: "Role change",
    status: "Blocked",
    tone: "danger" as const,
    updated: "2 days ago",
  },
];

export default function HomePage() {
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link className={styles.brand} href="/" aria-label="Colaboradores DNA home">
          <span className={styles.brandMark} aria-hidden="true">
            DNA
          </span>
          <span>Colaboradores</span>
        </Link>

        <p className={styles.navLabel}>Workspace</p>
        <SideNavigation currentHref="/" items={navigationItems} />

        <div className={styles.sidebarFooter}>
          <div className={styles.helpCard}>
            <strong>Need help?</strong>
            <span>Find process guides and team support in the knowledge base.</span>
          </div>
          <div className={styles.profile}>
            <span className={styles.avatar} aria-hidden="true">
              MP
            </span>
            <span>
              <strong>María Pérez</strong>
              <span>Product owner</span>
            </span>
          </div>
        </div>
      </aside>

      <div className={styles.mainColumn}>
        <header className={styles.topbar}>
          <details className={styles.mobileNav}>
            <summary>Open navigation</summary>
            <SideNavigation
              currentHref="/"
              items={navigationItems}
              label="Mobile navigation"
            />
          </details>
          <Breadcrumbs
            items={[{ label: "Workspace", href: "/" }, { label: "Overview" }]}
          />
          <div className={styles.topbarTools}>
            <div className={styles.searchField}>
              <TextField
                id="workspace-search"
                label="Search workspace"
                placeholder="Search people or processes"
                type="search"
                visuallyHiddenLabel
              />
            </div>
            <span className={styles.topbarStatus}>
              <StatusBadge tone="success">Systems online</StatusBadge>
            </span>
            <ThemeToggle />
          </div>
        </header>

        <main className={styles.content} id="main-content">
          <section className={styles.pageHeading} aria-labelledby="page-title">
            <div>
              <p className={styles.eyebrow}>Tuesday · Operations pulse</p>
              <h1 id="page-title">Good morning, María.</h1>
              <p>
                Here is what needs the team&apos;s attention across collaborator
                processes today.
              </p>
            </div>
            <div className={styles.headingActions}>
              <Button variant="secondary">Export report</Button>
              <ButtonLink href="#new-request">Add collaborator</ButtonLink>
            </div>
          </section>

          <section className={styles.metrics} aria-label="Workspace metrics">
            {metrics.map((metric) => (
              <article className={styles.metric} key={metric.label}>
                <div className={styles.metricTopline}>
                  <span className={styles.metricLabel}>{metric.label}</span>
                  <StatusBadge tone={metric.tone}>{metric.status}</StatusBadge>
                </div>
                <strong className={styles.metricValue}>{metric.value}</strong>
                <span className={styles.metricDetail}>{metric.detail}</span>
              </article>
            ))}
          </section>

          <div className={styles.dashboardGrid}>
            <Card id="processes">
              <CardHeader
                action={
                  <Button size="small" variant="quiet">
                    View all
                  </Button>
                }
                description="The most recently updated team workflows."
                title="Active processes"
              />
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <caption>Recently updated collaborator processes</caption>
                  <thead>
                    <tr>
                      <th scope="col">Collaborator</th>
                      <th scope="col">Process</th>
                      <th scope="col">Status</th>
                      <th scope="col">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentProcesses.map((item) => (
                      <tr key={item.name}>
                        <td>
                          <div className={styles.person}>
                            <span className={styles.personInitials} aria-hidden="true">
                              {item.initials}
                            </span>
                            <span>
                              <strong>{item.name}</strong>
                              <span>{item.owner}</span>
                            </span>
                          </div>
                        </td>
                        <td className={styles.tableMuted}>{item.process}</td>
                        <td>
                          <StatusBadge tone={item.tone}>{item.status}</StatusBadge>
                        </td>
                        <td className={styles.tableMuted}>{item.updated}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card id="new-request">
              <CardHeader
                description="Capture the minimum information needed to assign an owner."
                title="Start a process"
              />
              <CardBody>
                <form className={styles.form}>
                  <TextField
                    autoComplete="name"
                    id="collaborator-name"
                    label="Collaborator"
                    placeholder="Full name"
                    required
                  />
                  <div className={styles.formGrid}>
                    <SelectField id="process-type" label="Process" required>
                      <option value="">Select one</option>
                      <option>Onboarding</option>
                      <option>Role change</option>
                      <option>Contract renewal</option>
                      <option>Offboarding</option>
                    </SelectField>
                    <SelectField id="process-priority" label="Priority" required>
                      <option>Normal</option>
                      <option>High</option>
                      <option>Urgent</option>
                    </SelectField>
                  </div>
                  <TextAreaField
                    id="process-notes"
                    label="Context"
                    optional
                    placeholder="Add details the owner should know"
                    rows={3}
                  />
                  <CheckboxField
                    description="The selected owner will receive a workspace notification."
                    id="notify-owner"
                    label="Notify the owner when assigned"
                  />
                  <div className={styles.formActions}>
                    <Button fullWidth variant="secondary">
                      Save draft
                    </Button>
                    <Button fullWidth type="submit">
                      Create process
                    </Button>
                  </div>
                </form>
              </CardBody>
            </Card>
          </div>

          <Card className={styles.principles} id="design-system">
            <CardHeader
              description="The rules behind every component and workflow in this workspace."
              title="Design-system principles"
            />
            <CardBody>
              <div className={styles.principleGrid}>
                <article className={styles.principle}>
                  <span className={styles.principleNumber}>01</span>
                  <h3>Accessible by default</h3>
                  <p className={styles.principleText}>
                    Semantic structure, visible focus, clear labels, and sufficient
                    contrast are built into the components.
                  </p>
                </article>
                <article className={styles.principle}>
                  <span className={styles.principleNumber}>02</span>
                  <h3>Useful before decorative</h3>
                  <p className={styles.principleText}>
                    Information density, predictable actions, and plain language support
                    the team&apos;s daily operational work.
                  </p>
                </article>
                <article className={styles.principle}>
                  <span className={styles.principleNumber}>03</span>
                  <h3>Consistent, not rigid</h3>
                  <p className={styles.principleText}>
                    Shared tokens and patterns keep products familiar while allowing
                    each workflow to fit its content.
                  </p>
                </article>
              </div>
            </CardBody>
          </Card>
        </main>
      </div>
    </div>
  );
}
