import Link from "next/link";

import { AuthControls } from "@/components/auth/auth-controls";
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
  { href: "/", label: "Inicio", marker: "IN" },
  { href: "#collaborators", label: "Colaboradores", marker: "CO" },
  { href: "#processes", label: "Procesos", marker: "PR", badge: "8" },
  { href: "#documents", label: "Documentos", marker: "DO" },
  { href: "#reports", label: "Reportes", marker: "RE" },
  { href: "#design-system", label: "Sistema de diseño", marker: "SD" },
];

const metrics = [
  {
    detail: "4 se incorporaron este mes",
    label: "Colaboradores activos",
    status: "Saludable",
    tone: "success" as const,
    value: "128",
  },
  {
    detail: "En 5 áreas operativas",
    label: "Procesos abiertos",
    status: "En curso",
    tone: "info" as const,
    value: "24",
  },
  {
    detail: "Necesitan responsable esta semana",
    label: "Revisiones pendientes",
    status: "Atención",
    tone: "warning" as const,
    value: "8",
  },
  {
    detail: "Subió 6 puntos desde junio",
    label: "Finalización a tiempo",
    status: "En meta",
    tone: "success" as const,
    value: "92%",
  },
];

const recentProcesses = [
  {
    initials: "AM",
    name: "Ana Mora",
    owner: "Operaciones de personas",
    process: "Incorporación",
    status: "En curso",
    tone: "info" as const,
    updated: "Hace 12 min",
  },
  {
    initials: "DL",
    name: "Diego López",
    owner: "Legal",
    process: "Renovación de contrato",
    status: "Requiere revisión",
    tone: "warning" as const,
    updated: "Hace 1 h",
  },
  {
    initials: "SR",
    name: "Sofía Rojas",
    owner: "Finanzas",
    process: "Configuración de gastos",
    status: "Completado",
    tone: "success" as const,
    updated: "Ayer",
  },
  {
    initials: "JC",
    name: "José Castro",
    owner: "Operaciones de personas",
    process: "Cambio de puesto",
    status: "Bloqueado",
    tone: "danger" as const,
    updated: "Hace 2 días",
  },
];

export default function HomePage() {
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link
          className={styles.brand}
          href="/"
          aria-label="Inicio de Colaboradores DNA"
        >
          <span className={styles.brandMark} aria-hidden="true">
            DNA
          </span>
          <span>Colaboradores</span>
        </Link>

        <p className={styles.navLabel}>Espacio de trabajo</p>
        <SideNavigation currentHref="/" items={navigationItems} />

        <div className={styles.sidebarFooter}>
          <div className={styles.helpCard}>
            <strong>¿Necesitás ayuda?</strong>
            <span>
              Consultá las guías de procesos y el apoyo del equipo en la base de
              conocimiento.
            </span>
          </div>
        </div>
      </aside>

      <div className={styles.mainColumn}>
        <header className={styles.topbar}>
          <details className={styles.mobileNav}>
            <summary>Abrir navegación</summary>
            <SideNavigation
              currentHref="/"
              items={navigationItems}
              label="Navegación móvil"
            />
          </details>
          <Breadcrumbs
            items={[{ label: "Espacio de trabajo", href: "/" }, { label: "Inicio" }]}
          />
          <div className={styles.topbarTools}>
            <div className={styles.searchField}>
              <TextField
                id="workspace-search"
                label="Buscar en el espacio de trabajo"
                placeholder="Buscar personas o procesos"
                type="search"
                visuallyHiddenLabel
              />
            </div>
            <span className={styles.topbarStatus}>
              <StatusBadge tone="success">Sistemas disponibles</StatusBadge>
            </span>
            <ThemeToggle />
            <AuthControls />
          </div>
        </header>

        <main className={styles.content} id="main-content">
          <section className={styles.pageHeading} aria-labelledby="page-title">
            <div>
              <p className={styles.eyebrow}>Martes · Pulso operativo</p>
              <h1 id="page-title">Buenos días.</h1>
              <p>
                Esto es lo que requiere la atención del equipo en los procesos de
                colaboradores para hoy.
              </p>
            </div>
            <div className={styles.headingActions}>
              <Button variant="secondary">Exportar reporte</Button>
              <ButtonLink href="#new-request">Agregar colaborador</ButtonLink>
            </div>
          </section>

          <section
            className={styles.metrics}
            aria-label="Métricas del espacio de trabajo"
          >
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
                    Ver todos
                  </Button>
                }
                description="Los flujos del equipo actualizados más recientemente."
                title="Procesos activos"
              />
              <div
                aria-label="Tabla de procesos activos"
                className={styles.tableWrap}
                role="region"
                tabIndex={0}
              >
                <table className={styles.table}>
                  <caption>
                    Procesos de colaboradores actualizados recientemente
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Colaborador</th>
                      <th scope="col">Proceso</th>
                      <th scope="col">Estado</th>
                      <th scope="col">Actualización</th>
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
                description="Registrá la información mínima necesaria para asignar una persona responsable."
                title="Iniciar un proceso"
              />
              <CardBody>
                <form className={styles.form}>
                  <TextField
                    autoComplete="name"
                    id="collaborator-name"
                    label="Colaborador"
                    placeholder="Nombre completo"
                    required
                  />
                  <div className={styles.formGrid}>
                    <SelectField id="process-type" label="Proceso" required>
                      <option value="">Seleccioná una opción</option>
                      <option>Incorporación</option>
                      <option>Cambio de puesto</option>
                      <option>Renovación de contrato</option>
                      <option>Salida</option>
                    </SelectField>
                    <SelectField id="process-priority" label="Prioridad" required>
                      <option>Normal</option>
                      <option>Alta</option>
                      <option>Urgente</option>
                    </SelectField>
                  </div>
                  <TextAreaField
                    id="process-notes"
                    label="Contexto"
                    optional
                    placeholder="Agregá los detalles que debe conocer la persona responsable"
                    rows={3}
                  />
                  <CheckboxField
                    description="La persona responsable recibirá una notificación en el espacio de trabajo."
                    id="notify-owner"
                    label="Notificar al asignar la persona responsable"
                  />
                  <div className={styles.formActions}>
                    <Button fullWidth variant="secondary">
                      Guardar borrador
                    </Button>
                    <Button fullWidth type="submit">
                      Crear proceso
                    </Button>
                  </div>
                </form>
              </CardBody>
            </Card>
          </div>

          <Card className={styles.principles} id="design-system">
            <CardHeader
              description="Las reglas que orientan cada componente y flujo de este espacio de trabajo."
              title="Principios del sistema de diseño"
            />
            <CardBody>
              <div className={styles.principleGrid}>
                <article className={styles.principle}>
                  <span className={styles.principleNumber}>01</span>
                  <h3>Accesible desde el inicio</h3>
                  <p className={styles.principleText}>
                    La estructura semántica, el foco visible, las etiquetas claras y el
                    contraste suficiente forman parte de los componentes.
                  </p>
                </article>
                <article className={styles.principle}>
                  <span className={styles.principleNumber}>02</span>
                  <h3>Útil antes que decorativo</h3>
                  <p className={styles.principleText}>
                    La densidad de información, las acciones predecibles y el lenguaje
                    claro apoyan el trabajo operativo diario del equipo.
                  </p>
                </article>
                <article className={styles.principle}>
                  <span className={styles.principleNumber}>03</span>
                  <h3>Consistente, no rígido</h3>
                  <p className={styles.principleText}>
                    Los patrones y tokens compartidos mantienen la familiaridad sin
                    impedir que cada flujo se adapte a su contenido.
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
