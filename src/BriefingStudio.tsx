import { useState, type ReactNode } from "react";
import * as Collapsible from "@radix-ui/react-collapsible";
import * as Slider from "@radix-ui/react-slider";
import * as ToggleGroup from "@radix-ui/react-toggle-group";
import { useSearchParams } from "react-router-dom";
import { FIELDS, catalog, type Topic } from "./data";
import { useSession } from "./session-context";
import "./briefing-studio.css";

const briefSections = [
  "Why it matters",
  "Key findings",
  "Evidence",
  "Limitations",
  "Next actions",
  "Code & data",
];

function FieldPicks({ selected, onChange }: { selected: Topic[]; onChange: (fields: Topic[]) => void }) {
  return (
    <ToggleGroup.Root className="briefing-fields" type="multiple" value={selected} onValueChange={(values) => onChange(values as Topic[])} aria-label="Research fields">
      {FIELDS.map((field) => <ToggleGroup.Item key={field.id} value={field.id} title={field.blurb}>{field.id}</ToggleGroup.Item>)}
    </ToggleGroup.Root>
  );
}

function CoveragePicker({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const contextLabel = value <= 10 ? "Focused context" : value <= 30 ? "Standard context" : "Broad context";
  return (
    <div className="briefing-slider-box">
      <div className="briefing-slider-value"><span><strong>{value} papers maximum</strong><small>{contextLabel}</small></span><output>{value}</output></div>
      <Slider.Root className="briefing-slider" min={1} max={50} step={1} value={[value]} onValueChange={([next]) => onChange(next)} aria-label="Maximum papers returned">
        <Slider.Track className="briefing-slider-track"><Slider.Range className="briefing-slider-range" /></Slider.Track>
        <Slider.Thumb className="briefing-slider-thumb" />
      </Slider.Root>
      <div className="briefing-slider-marks"><span>1</span><span>25</span><span>50</span></div>
    </div>
  );
}

function ControlLabel({ children, note }: { children: ReactNode; note?: string }) {
  return <div className="briefing-control-label"><strong>{children}</strong>{note ? <span>{note}</span> : null}</div>;
}

function PacketPreview({ fields, count, instruction }: { fields: Topic[]; count: number; instruction: string }) {
  const paper = catalog[0]?.papers[0];
  const evidence = paper?.metrics?.length ? paper.metrics.join(" ") : paper?.takeaways[0];
  const exampleFields = paper ? [
    { key: "why_it_matters", value: paper.reported ?? paper.verdictWhy ?? paper.takeaway },
    { key: "key_findings", value: paper.takeaway },
    { key: "evidence", value: evidence ?? "Evidence summary unavailable." },
    { key: "limitations", value: paper.takeaways[1] ?? "No limitation recorded." },
    { key: "next_actions", value: paper.actions[0] ?? "No action recorded." },
    { key: "code_and_data", value: paper.github ? `Repository: ${paper.github}` : `Paper: ${paper.url}` },
  ] : [];

  return (
    <section className="briefing-preview" aria-label="API response preview">
      <header className="briefing-preview-head">
        <div><span>Response preview</span><h2>Latest ready packet</h2></div>
        <span className="briefing-status"><i /> 200 OK</span>
      </header>
      <div className="briefing-response-summary"><strong>{count} papers</strong><span>{fields.length ? fields.join(" · ") : "All fields"}</span><span>{briefSections.length} sections per paper</span></div>
      <div className="briefing-agent-note"><span>Instruction for your agent</span><p>{instruction || "No instruction attached."}</p></div>
      {paper ? (
        <Collapsible.Root className="briefing-example" defaultOpen>
          <Collapsible.Trigger className="briefing-example-trigger">
            <span><small>Example paper · {paper.topic}</small><strong>{paper.title}</strong></span>
            <span className="briefing-example-action"><b className="show-label">Show format</b><b className="hide-label">Hide format</b><i /></span>
          </Collapsible.Trigger>
          <Collapsible.Content>
            <div className="briefing-example-fields">
              {exampleFields.map((field) => <section key={field.key}><code>{field.key}</code><p>{field.value}</p></section>)}
            </div>
          </Collapsible.Content>
        </Collapsible.Root>
      ) : null}
      <p className="briefing-remaining">{count > 1 ? <>…and <strong>{count - 1}</strong> others</> : "This is the complete response."}</p>
    </section>
  );
}

export default function BriefingStudio() {
  const { toast } = useSession();
  const [searchParams] = useSearchParams();
  const [saved, setSaved] = useState(searchParams.get("manage") === "1");
  const [fields, setFields] = useState<Topic[]>(["AI", "Stats", "Security"]);
  const [count, setCount] = useState(25);
  const [instruction, setInstruction] = useState("Review these papers against my active projects. Flag material changes to current approaches, then propose one concrete experiment for each relevant paper.");
  const endpointPath = `/api/v1/digest/latest?limit=${count}`;

  function saveEndpoint() {
    setSaved(true);
    toast("Endpoint configuration saved");
  }

  async function copyEndpoint() {
    try {
      await navigator.clipboard.writeText(endpointPath);
      toast("Endpoint copied");
    } catch {
      toast("Could not copy the endpoint");
    }
  }

  if (saved) {
    return (
      <div className="briefing-studio">
        <header className="briefing-page-head">
          <div><p>Briefing studio</p><h1>Your research endpoint</h1><span>One endpoint per account. Edit this configuration whenever your research scope changes.</span></div>
          <b className="briefing-active"><i /> Active</b>
        </header>
        <section className="briefing-manage-card">
          <div className="briefing-card-head"><div><span>Endpoint</span><h2>Latest daily briefing</h2></div></div>
          <div className="briefing-url"><b>GET</b><code>{endpointPath}</code><button type="button" onClick={copyEndpoint}>Copy</button></div>
          <p className="briefing-auth-note">Authenticated with the account API key. Returns the latest completed Agent JSON edition.</p>
          <dl className="briefing-summary-list">
            <div><dt>Research fields</dt><dd>{fields.length ? fields.join(", ") : "All fields"}</dd></div>
            <div><dt>Paper limit</dt><dd>{count}</dd></div>
            <div><dt>Brief format</dt><dd>Six sections per paper</dd></div>
            <div><dt>Account allowance</dt><dd>1 endpoint</dd></div>
          </dl>
          <div className="briefing-agent-note"><span>Instruction for your agent</span><p>{instruction || "No instruction attached."}</p></div>
          <button className="briefing-primary" type="button" onClick={() => setSaved(false)}>Edit configuration</button>
        </section>
        <PacketPreview fields={fields} count={count} instruction={instruction} />
      </div>
    );
  }

  return (
    <div className="briefing-studio">
      <header className="briefing-page-head"><div><p>Briefing studio</p><h1>Research endpoint</h1><span>Choose the research scope, paper limit, and instruction your agent receives. PaperScroll handles the daily analysis once.</span></div></header>
      <section className="briefing-settings-card">
        <div className="briefing-card-head"><div><span>Endpoint settings</span><h2>Daily research packet</h2></div><p>One configuration controls the briefing your agent receives.</p></div>
        <div className="briefing-setting">
          <ControlLabel note="Fields to include">Scope</ControlLabel>
          <div><ControlLabel note="Choose one or more shared desks.">Research fields</ControlLabel><FieldPicks selected={fields} onChange={setFields} /></div>
        </div>
        <div className="briefing-setting">
          <ControlLabel note="Number of papers">Packet</ControlLabel>
          <div><ControlLabel note="Passed to the endpoint as the limit parameter.">Paper limit</ControlLabel><CoveragePicker value={count} onChange={setCount} /><p className="briefing-inclusion"><strong>Full brief included</strong><span>Every paper includes why it matters, findings, evidence, limitations, next actions, and code or data.</span></p></div>
        </div>
        <div className="briefing-setting">
          <ControlLabel note="Fixed JSON contract">Endpoint</ControlLabel>
          <div className="briefing-endpoint-controls">
            <div className="briefing-contract"><span><b>GET</b><code>{endpointPath}</code></span><small>Agent JSON · latest completed edition · pulled on demand</small></div>
            <label className="briefing-instruction"><span><span><strong>Instruction for your agent</strong><small>Returned verbatim with the packet. PaperScroll does not use it to rank or summarize.</small></span><b>{instruction.length}/600</b></span><textarea maxLength={600} value={instruction} onChange={(event) => setInstruction(event.target.value)} /></label>
          </div>
        </div>
        <div className="briefing-actions"><span>{count} papers · Full brief</span><button className="briefing-primary" type="button" onClick={saveEndpoint}>Save changes</button></div>
      </section>
      <PacketPreview fields={fields} count={count} instruction={instruction} />
      <footer className="briefing-footnote"><strong>Prototype boundary</strong><span>Controls are interactive; persistence, billing, and fulfillment are not wired yet.</span></footer>
    </div>
  );
}
