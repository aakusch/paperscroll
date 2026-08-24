import { editionFromPool } from "./hydrate";
import { belongsOnBoard } from "./listing";
import type { MorningPool } from "./pool";
import { HOSTED_SLATES } from "./slates";

export type Topic = "AI" | "Stats" | "Math" | "Econ" | "Health" | "Physics" | "Security";
export type Verdict = "Try" | "Watch" | "Skip";
export type Intake =
  | "HF Daily"
  | "arXiv"
  | "lab RSS"
  | "NBER"
  | "medRxiv"
  | "bioRxiv";

export type Paper = {
  id: string;
  arxivId: string;
  url: string;
  topic: Topic;
  verdict: Verdict;
  verdictWhy: string;
  title: string;
  authors: string;
  takeaway: string;
  brief?: string;
  abstract?: string;
  takeaways: string[];
  /** Same facts as the host brief, written for a smart reader outside the subfield. */
  plain?: {
    verdictWhy: string;
    brief: string;
    takeaways: string[];
  };
  actions: string[];
  intake?: Intake;
  github?: string;
  tags?: string[];
  notes?: string[];
  listing?: Listing;
  /** Hugging Face Daily Papers heat on the morning this card was listed. */
  trend?: DailyTrend;
};

export type DailyTrend = {
  votes: number;
  rank: number;
  of: number;
  perDay: number;
};

export type ListSource = "hf-daily" | "arxiv-new";

export type ListingIntake = {
  kind: ListSource;
  evidenceUrl: string;
  upvotes?: number;
};

export type Listing = {
  listedOn: string;
  publishedOn: string;
  intakes: ListingIntake[];
};

export type Edition = {
  date: string;
  label: string;
  minutes: number;
  papers: Paper[];
  /** Eligible morning-pool size before the cut to ten. */
  poolSize?: number;
  /** True when this day was hydrated from src/pools/*.json */
  live?: boolean;
};

export const TOPICS: Array<"All" | Topic> = [
  "All",
  "AI",
  "Stats",
  "Math",
  "Econ",
  "Health",
  "Physics",
  "Security",
];

export const FIELDS: Array<{ id: Topic; blurb: string }> = [
  { id: "AI", blurb: "Models, evals, systems." },
  { id: "Stats", blurb: "Inference, uncertainty, experiments." },
  { id: "Math", blurb: "Theory that might land in a method." },
  { id: "Econ", blurb: "Labor, markets, policy papers." },
  { id: "Health", blurb: "Clinics, EHR, bio when it’s a paper." },
  { id: "Physics", blurb: "Quantum, condensed matter, the lab sciences." },
  { id: "Security", blurb: "Crypto, systems, privacy, proofs." },
];

const editions: Edition[] = [
  {
    date: "2026-08-20",
    label: "Today · Thu 20 Aug",
    minutes: 9,
    papers: [
      {
        id: "t1",
        arxivId: "2608.16590",
        url: "https://arxiv.org/abs/2608.16590",
        topic: "AI",
        verdict: "Watch",
        verdictWhy: "Closed-loop robot harness. Useful if you already ship skills on hardware.",
        title:
          "Zetta ζ: An Efficient Closed-Loop Embodied Harness for Self-Evolving Physical Intelligence",
        authors: "Ding et al.",
        takeaway:
          "Keep the base policy frozen; evolve runtime critics and recovery skills while the robot is running.",
        brief:
          "Most “embodied agents” still run open-loop: they pick a skill, execute it, and only reflect when the episode is over. Zetta’s claim is that this is the wrong timescale for a robot. Physical state moves faster than a large agentic model, so governance has to sit on the control loop, not in a post-hoc writeup.\n\nThey freeze the base policy and instead evolve code-based runtime critics and recovery skills online, through three nested loops (action-frequency checks, rollout-level critic/recovery proposals, and a validation gate before a skill is written). The interesting artifact is the public harness, not a new SOTA policy.\n\nTreat this as infrastructure for teams that already have skills on hardware. It does not replace training a VLA, and the numbers live on their stack.",
        takeaways: [
          "The contribution is a closed-loop harness, not a better end-to-end policy. If your bottleneck is “the robot did something dumb mid-skill and nobody was watching,” this is on-topic.",
          "The validation gate is doing the product work: skills only land after logged checks. If that gate is just a logger, the whole story collapses — worth reading that section first.",
          "GitHub is on the Daily Papers card (Zetta-Embodiment). Useful to clone; not useful as a from-scratch bet if you do not already run an embodied stack.",
        ],
        plain: {
          verdictWhy:
            "A supervisor that watches a robot while it moves, not after the run. Useful if you already run skills on hardware.",
          brief:
            "Most robot “agents” still pick a skill, run it to the end, and only think about what went wrong afterwards. That is too late: the physical world changes faster than a large model can write a postmortem.\n\nZetta leaves the main control policy alone. While the robot is running, it writes and checks small programs that criticize the current move and suggest recoveries. Those programs only become lasting skills after a validation gate, not because the model felt confident. The public piece is this harness, not a new champion policy.\n\nOpen it if you already have skills on a real robot and nobody is watching mid-motion. It will not replace training a vision-language-action model, and the published scores are on their stack.",
          takeaways: [
            "The paper is a live supervisor, not a better robot brain. If your failure mode is “it did something dumb halfway through a skill,” this is the right kind of object.",
            "Skills only stick after logged checks. If that gate is just a diary, the claim falls apart — read that section first.",
            "The GitHub repo (Zetta-Embodiment) is listed on Daily Papers. Clone it if you already run an embodied stack; it is not a from-scratch bet.",
          ],
        },
        actions: [
          "If you ship skills on a real robot, skim the three-loop diagram and clone the repo before you invent a similar supervisor.",
          "If you are choosing a VLA checkpoint this week, this paper is not that decision. Watch, don’t block the morning on it.",
        ],
      },
      {
        id: "t2",
        arxivId: "2608.14929",
        url: "https://arxiv.org/abs/2608.14929",
        topic: "AI",
        verdict: "Try",
        verdictWhy: "Weight-space lineage check you can run on two checkpoints.",
        title:
          "Training Leaves Traces: Centered Residual Signatures for Language Model Lineage Verification",
        authors: "Thakur, Khoury",
        takeaway:
          "After stripping the shared residual identity, checkpoint-specific structure still says whether two open-weight models share ancestry.",
        brief:
          "Open-weight models get fine-tuned, quantized, pruned, and merged, and the “this is a Llama descendant” field is often a rumor. This paper asks a narrower, better question: from weights alone, can you tell whether two compatible checkpoints share ancestry?\n\nTheir move is to throw away the shared residual identity (which every branch of a family carries) and score the leftover block-wise structure against independent checkpoints. On residual-MLP and GPT-2 benches they separate LoRA/quant/prune descendants from independent and distilled models. Function-preserving laundering that wrecks naive weight baselines does not wreck this score.\n\nThere is no repo on the HF card, so “Try” here means “implement from the paper,” not “pip install.” Still the most decision-relevant AI paper on today’s board if you ingest other people’s weights.",
        takeaways: [
          "This is provenance, not quality. A high lineage score does not mean the model is safe or good; it means the weights are not an independent training run pretending to be a cousin.",
          "Distillation is correctly treated as a negative: behavioral clones that do not share residual structure should look unrelated. If you care about license/ancestry, that is the behavior you want.",
          "You will write the checker yourself. Budget an afternoon, not a sprint, and start with two known relatives and one unrelated checkpoint as a sanity test.",
        ],
        plain: {
          verdictWhy:
            "A check, from the weights alone, on whether two models share a family tree.",
          brief:
            "Open models get fine-tuned, compressed, and merged, and the “this came from Llama” line is often gossip. This paper asks a smaller, better question: looking only at the numbers in two compatible checkpoints, can you tell if they share ancestry?\n\nThey throw away the part of the network every cousin in a family shares, then score the leftover pattern against models that should be unrelated. On residual-MLP and GPT-2 tests, fine-tunes, quantized, and pruned descendants still look related; independently trained and distilled copies do not. Tricks that fool naive weight comparisons do not fool this score.\n\nThere is no code on the Hugging Face card, so “Try” means implement from the PDF. If you ingest other people’s weights, this is the most decision-relevant AI paper on the board.",
          takeaways: [
            "This is family history, not quality. A high score does not mean the model is safe or good; it means the weights are not an independent training run in costume.",
            "Distillation is treated as unrelated, on purpose: a behavioral clone that did not inherit residual structure should look like a stranger. That is what you want for license and provenance.",
            "You will write the checker. Budget an afternoon. Start with two known relatives and one unrelated checkpoint.",
          ],
        },
        actions: [
          "If your org downloads open weights, put this PDF next to whatever currently says `base_model:` in the card.",
          "If you never look at checkpoints, leave it. This is not a general LLM paper.",
        ],
      },
      {
        id: "t3",
        arxivId: "2608.18171",
        url: "https://arxiv.org/abs/2608.18171",
        topic: "AI",
        verdict: "Watch",
        verdictWhy: "Looped LMs help multi-step tools. Isolated API calls, less so.",
        title: "Looped Language Models Improve Compositional Tool Calling",
        authors: "Popescu, Sáez de Ocáriz Borde, Liò",
        takeaway:
          "Recurrent depth helps when tools have dependencies; adaptive inference beats a fixed deep loop on compute.",
        brief:
          "Looped language models already show up on reasoning benches. This paper asks whether the same recurrent compute helps when the job is compositional tool use: several APIs, intermediate state, dependencies between calls.\n\nThey compare native and retrofitted looped models to non-looped ones under matched SFT, on API-Bank, BFCL, and NESTful, and vary recurrent depth at inference. The pattern is unsurprising but useful: multi-step, dependency-aware calls benefit; isolated single-API calls much less. Adaptive depth beats “always loop a lot” on the compute curve.\n\nNo public training recipe on the Daily Papers card. Treat it as a measurement paper for people who already loop at inference, not as a drop-in agent runtime.",
        takeaways: [
          "If your eval is “did the model call the right weather API once,” you will understate the method. The gain is on chains.",
          "Matched SFT matters: they are not comparing a 670B looper to a 8B baseline. Read the training recipe before you quote a percentage.",
          "Adaptive inference is the part to steal. A fixed recurrent depth is a cost you pay on every turn, including the easy ones.",
        ],
        plain: {
          verdictWhy:
            "Looping the same model helps when tools depend on each other. One-shot API calls, less so.",
          brief:
            "Some language models reuse their own layers instead of growing deeper in the usual way. This paper asks whether that extra thinking-time helps when the job is calling several tools in a chain, with later calls depending on earlier ones.\n\nThey train looped and ordinary models the same way, then test on tool-use benches. Chains with dependencies improve; isolated single-API calls barely do. Letting the model choose how many loops to run beats always looping a lot, on cost.\n\nNo public training recipe on the Daily Papers card. Treat it as a measurement paper if you already loop at inference, not as a drop-in agent.",
          takeaways: [
            "If your eval is “did it call the weather API once,” you will miss the gain. The method is for sequences of tools.",
            "They matched the training. Do not quote a percentage until you have checked they were not comparing a giant looper to a tiny baseline.",
            "Adaptive looping is the steal. A fixed deep loop is a tax on every turn, including the easy ones.",
          ],
        },
        actions: [
          "If you already unroll a model at inference for tools, read the depth-vs-accuracy figure and the adaptive rule.",
          "Do not pause a production agent rewrite for this until someone releases the training code.",
        ],
      },
      {
        id: "t4",
        arxivId: "2608.18565",
        url: "https://arxiv.org/abs/2608.18565",
        topic: "AI",
        verdict: "Try",
        verdictWhy: "Verification-gated PLC codegen, public repo, live runtime checks.",
        title:
          "SemaPLC: A Project-Grounded, Verification-Gated Agent Harness for PLC Code Generation",
        authors: "Tu et al.",
        takeaway:
          "The task is not done when the model likes its POU. It is done when spec, compile, and live runtime checks all log a pass.",
        brief:
          "LLMs can already emit isolated PLC program units. The hard part is dropping that logic into an existing plant project and having it compile and run. SemaPLC is a harness around ordinary tools with a strict completion rule: the agent does not get to declare success. External logs do.\n\nOn 117 independent-POU tasks it posts the highest strict verified pass rate across seven models (72.6% mean). A second track of 65 project-context tasks requires the generated logic to compile and run inside a real project. That is the paper. The artifact is public.\n\nTry if you generate industrial logic or any codegen that can be checked by a compiler plus a runtime. Watch if you wanted a new base model.",
        takeaways: [
          "The product idea is the completion rule, not another coding LLM. If your eval is “the model said it worked,” you are measuring the wrong thing.",
          "Independent-POU numbers are the easy track. Read the project-context track before you quote 72.6%.",
          "GitHub is listed (midea-ai/SemaPLC). First on arXiv 19 Aug; it cleared the morning-pool age check.",
        ],
        plain: {
          verdictWhy:
            "Generated plant code is not done until spec, compile, and a live controller all log a pass. Public repo.",
          brief:
            "Language models can already write a single PLC routine. The hard part is dropping that logic into an existing factory project so it compiles and actually runs. SemaPLC wraps ordinary tools with a strict rule: the agent does not get to say it succeeded. External logs do.\n\nOn 117 standalone-routine tasks it has the highest strict pass rate across seven models (about 73% on average). A harder track of 65 tasks requires the new logic to compile and run inside a real project. That second track is the paper. The code is public.\n\nTry this if you generate industrial logic, or any code a compiler and a runtime can check. Watch if you wanted a new base model.",
          takeaways: [
            "The product is the completion rule, not another coding model. If your eval is “the model said it worked,” you are measuring the wrong thing.",
            "Standalone-routine numbers are the easy track. Read the in-project track before you quote 72.6%.",
            "GitHub is listed (midea-ai/SemaPLC). First on arXiv 19 Aug; it cleared the morning age check.",
          ],
        },
        actions: [
          "If you already emit PLC or similarly checkable code, clone the harness and steal the logged-check gate.",
          "If you do not have a compiler in the loop, this is a Watch for the eval idea only.",
        ],
      },
      {
        id: "t5",
        arxivId: "2608.18973",
        url: "https://arxiv.org/abs/2608.18973",
        topic: "Stats",
        verdict: "Try",
        verdictWhy: "Stops you throwing away incomplete pairs after attrition.",
        title:
          "Don't Drop the Singletons: Efficient Inference for Pairwise Experiments with Independent Attrition",
        authors: "Heß, Schmidt",
        takeaway:
          "If attrition is independent of treatment and potential outcomes, keep the unpaired units. Pair FE is the inefficient bit, not pairing itself.",
        brief:
          "Pairwise randomization is efficient until someone attrits and the analysis drops the leftover singleton. Textbooks often treat that as a reason not to pair. Heß and Schmidt argue the textbooks were describing a bad estimator (pair fixed effects), not a bad design.\n\nIf attrition is independent of treatment and potential outcomes, a permutation test can use complete pairs and incomplete pairs together, still respect the pairwise assignment, and keep exact size under the sharp null. That is a real analysis change: stop throwing away people because their pair-mate left.\n\nThe independence assumption is doing a lot of work. Treatment-related dropout is a different paper. If that is your setting, this does not rescue the design.",
        takeaways: [
          "The operational mistake is `lm(..., pair FE)` plus dropping incomplete pairs. Fix the estimator before you abandon pairing in the next experiment.",
          "Exact size under the sharp null is stronger than “we have a sandwich SE.” If you live in experiments, that is the sentence to check in the proofs.",
          "Independent attrition is an assumption you should try to falsify (differential dropout by arm) before you celebrate the extra n.",
        ],
        plain: {
          verdictWhy:
            "After someone drops out of a paired experiment, keep the leftover person. The usual analysis throws them away.",
          brief:
            "Pairing similar people (or units) before randomizing is efficient until someone leaves the study and the analysis drops their partner too. Textbooks often treat that as a reason not to pair. Heß and Schmidt say the textbooks were describing a bad analysis, not a bad design.\n\nIf dropout is independent of treatment and of what would have happened anyway, a permutation test can use complete pairs and leftovers together, still respect the pairing, and keep the false-positive rate exact under a sharp null. In practice: stop throwing away people because their pair-mate left.\n\nThat independence is doing a lot of work. Dropout caused by the treatment is a different paper. This does not rescue that design.",
          takeaways: [
            "The operational mistake is pair fixed effects plus dropping incomplete pairs. Fix the estimator before you abandon pairing in the next experiment.",
            "Exact size under the sharp null is stronger than “we have robust standard errors.” If you run experiments, that is the sentence to check in the proofs.",
            "Independent attrition is an assumption. Try to falsify it (dropout rates that differ by arm) before you celebrate the extra sample.",
          ],
        },
        actions: [
          "If you have a paired trial with holes, try their permutation procedure on last quarter’s data before you change the protocol.",
          "If you never pair units, this is not your morning.",
        ],
      },
      {
        id: "t6",
        arxivId: "2608.19070",
        url: "https://arxiv.org/abs/2608.19070",
        topic: "Math",
        verdict: "Watch",
        verdictWhy: "Consistency for a neural operator on function-on-function regression.",
        title: "Function-On-Function Regression Through Separable Neural Operators",
        authors: "Hsing, Huang, Morimoto",
        takeaway:
          "A separable neural operator (input-dependent coefficients, output-dependent bases) is consistent under mild smoothness, including irregular dense grids.",
        brief:
          "Function-on-function regression is still mostly linear, or linear plus a mild twist. This paper puts a separable neural operator on the map: input-dependent coefficient functions times output-dependent bases, with a consistency theorem under smoothness and sampling conditions that allow dense, irregular grids.\n\nThe vocabulary is borrowed from neural operators for PDEs; the object is FDA. The empirical illustration is BGC Argo, not a fluids benchmark. There is no software named in the abstract.\n\nSpecialists only. If you already estimate operators between function spaces, the theorem is the reason to open the PDF. If you wanted a PINN or a GNN, you are in the wrong aisle.",
        takeaways: [
          "Read it as statistics of functional data, not as “we solved PDEs with a new net.” The Argo example is a demonstration, not a leaderboard.",
          "Consistency on irregular dense grids is the practical clause. A lot of FDA still pretends the grid is a nice mesh.",
          "No artifact. You will reimplement, or wait for someone else to.",
        ],
        plain: {
          verdictWhy:
            "A theorem that a particular neural operator is consistent for mapping one function to another.",
          brief:
            "Predicting one whole curve from another is still mostly linear. This paper studies a separable neural operator: coefficients that depend on the input function, times bases that depend on the output, plus a consistency theorem under smoothness and sampling conditions that allow messy, dense grids.\n\nThe language comes from neural operators for physics simulations; the object is functional data analysis. The illustration is ocean-float temperature profiles (BGC Argo), not a fluids leaderboard. No software is named in the abstract.\n\nSpecialists only. If you already estimate maps between function spaces, the theorem is why you open the PDF. If you wanted a PINN or a GNN, you are in the wrong aisle.",
          takeaways: [
            "Read it as statistics of functions, not “we solved PDEs with a new net.” The Argo example is a demonstration, not a bake-off.",
            "Consistency on irregular dense grids is the practical clause. A lot of this field still pretends the grid is a nice mesh.",
            "No code. You will reimplement, or wait.",
          ],
        },
        actions: [
          "Open if function-on-function maps are already on your desk.",
          "Otherwise this is a fair Skip for a coffee-length board.",
        ],
      },
      {
        id: "t7",
        arxivId: "2608.18375",
        url: "https://arxiv.org/abs/2608.18375",
        topic: "Econ",
        verdict: "Watch",
        verdictWhy: "Usual DiD mixes direct, indirect, and trend bias when a mediator moves.",
        title:
          "Difference-in-Differences Models in the Presence of Time-Varying Mediators",
        authors: "Ban, Chen, Kédagni",
        takeaway:
          "TWFE with the mediator as a control does not recover the average direct effect on the treated. Condition on the mediator path instead.",
        brief:
          "Lots of applied DiD papers “control for” a time-varying mediator that the treatment itself moves. Ban, Chen, and Kédagni show the usual DiD estimand then mixes the average direct effect on the treated, the average indirect effect, and a trend-bias term. Two-way fixed effects plus the mediator as a regressor does not recover the direct effect.\n\nTheir alternative: condition on the observed mediator path. That identifies the conditional average direct effect for treated units on that path; averaging over the treated path distribution recovers the average direct effect even when unconditional parallel trends fails. A stability condition on the average mediator effect gets you indirect effects. They say existing doubly robust estimators can be reused, and they revisit railroad access.\n\nIf your identification strategy was TWFE + mediator, this is a stop-the-presses methods paper, not a curiosity.",
        takeaways: [
          "“Control for the mediator” is not conservative. It is a different, usually unidentified, mix of effects. That should change how you read a pile of applied DiD.",
          "The path-conditional estimand is the object. If you cannot describe the mediator path in your data, you cannot implement this.",
          "Railroad access is an illustration. Steal the estimand, not their historical conclusion.",
        ],
        plain: {
          verdictWhy:
            "When a treatment moves a middle variable, the usual difference-in-differences mix three different stories.",
          brief:
            "Many applied papers “control for” a middle variable that the treatment itself changes over time. Ban, Chen, and Kédagni show the usual difference-in-differences number then mixes the direct effect on treated units, the indirect effect through that middle variable, and a trend-bias term. Two-way fixed effects plus the mediator as a regressor does not recover the direct effect.\n\nTheir fix: condition on the observed path of the mediator. That identifies a direct effect for treated units on that path; averaging over the treated paths recovers an average direct effect even when the usual parallel-trends story fails unconditionally. A stability condition gets you indirect effects. They say existing doubly robust estimators can be reused, and they revisit railroad access.\n\nIf your identification strategy was two-way fixed effects plus a mediator, this is a methods stop, not a curiosity.",
          takeaways: [
            "Controlling for the mediator is not conservative. It is a different, usually unidentified, mix of effects. That should change how you read a pile of applied DiD.",
            "The path-conditional number is the object. If you cannot describe the mediator’s path in your data, you cannot implement this.",
            "Railroad access is an illustration. Steal the estimand, not their historical conclusion.",
          ],
        },
        actions: [
          "If a current paper or project puts a time-varying mediator on the right-hand side of TWFE, read this before the next draft.",
          "If there is no mediator, keep walking.",
        ],
      },
      {
        id: "t8",
        arxivId: "2608.18451",
        url: "https://arxiv.org/abs/2608.18451",
        topic: "Health",
        verdict: "Watch",
        verdictWhy: "Lead-agnostic AF detector. Cross-dataset is the result; clinic is not.",
        title:
          "Atrial Fibrillation Detection with Arbitrary Leads via a Codebook-Based Reconstruction-Classification Framework",
        authors: "Li et al.",
        takeaway:
          "A dual-codebook VAE classifies AF and reconstructs ECG so the model survives missing leads and dataset shift better than a vanilla classifier.",
        brief:
          "AF detection papers usually assume a clean 12-lead in-distribution recording. Clinics do not. Li et al. train a dual-codebook VAE that classifies AF and reconstructs the ECG at the same time, with a contrastive local-global module and an adaptive codebook so the codebook does not collapse.\n\nThey report strong in-dataset 12-lead numbers and, more importantly, cross-dataset tests across seven sources with variable leads. That is the product hook: arbitrary-lead, shift-robust screening — still on public corpora, still not a prospective trial.\n\nWatch, do not ship. Methods SOTA on PhysioNet-style sets has a long history of dying in the ward.",
        takeaways: [
          "Reconstruction plus classification is doing regularization work: the model has to explain the waveform, not just say AF. That is why missing leads hurt less, in their telling.",
          "Seven-dataset generalization is the result to audit. If it is leave-one-dataset-out, say so; if it is a pooled shuffle, discount it.",
          "No clinical operating point, no prospective n. Useful as a methods pointer for messy-lead ECG, not as a 510(k) narrative.",
        ],
        plain: {
          verdictWhy:
            "Detects atrial fibrillation even when leads are missing. Cross-dataset is the result; a clinic is not.",
          brief:
            "Most AF-from-ECG papers assume a clean 12-lead recording from the same distribution you trained on. Clinics do not. Li et al. train a model that classifies AF and reconstructs the ECG at the same time, using two codebooks and a contrastive local-global module so the codebook does not collapse.\n\nThey report strong in-dataset 12-lead numbers and, more importantly, tests across seven sources with variable leads. That is the product hook: screening that survives missing leads and dataset shift — still on public corpora, still not a prospective trial.\n\nWatch, do not ship. Methods that win on PhysioNet-style sets have a long history of dying in the ward.",
          takeaways: [
            "Reconstruction plus classification is regularization: the model has to explain the waveform, not just say AF. That is why missing leads hurt less, in their telling.",
            "Seven-dataset generalization is the result to audit. If it is leave-one-dataset-out, say so; if it is a pooled shuffle, discount it.",
            "No clinical operating point, no prospective n. Useful as a methods pointer for messy-lead ECG, not as a regulatory narrative.",
          ],
        },
        actions: [
          "If you already train AF models on heterogeneous leads, steal the codebook/reconstruction setup and re-run on your hidden site.",
          "Do not cite this as clinical performance. Watch for a trial, or run one.",
        ],
      },
      {
        id: "t9",
        arxivId: "2608.14201",
        url: "https://arxiv.org/abs/2608.14201",
        topic: "AI",
        verdict: "Skip",
        verdictWhy: "Another instruction-mix paper. No artifact, no new eval.",
        title: "MixTweak-8B: Yet Another Instruction-Tuning Mixture",
        authors: "mock",
        takeaway:
          "Swap three datasets, report MMLU up 0.4. The morning already has better AI.",
        takeaways: ["Leaderboard noise."],
        actions: ["Leave it."],
      },
      {
        id: "t10",
        arxivId: "2608.13888",
        url: "https://arxiv.org/abs/2608.13888",
        topic: "AI",
        verdict: "Watch",
        verdictWhy: "Eleven-day-old HF pickup of a toy scaling note.",
        title: "Scaling Curves for a 1.3B Toy Transformer",
        authors: "mock",
        takeaway: "The curve bends. We already knew curves bend.",
        takeaways: ["Not news."],
        actions: ["Skip unless you collect toy-scale plots."],
      },
      {
        id: "t11",
        arxivId: "2608.15502",
        url: "https://arxiv.org/abs/2608.15502",
        topic: "AI",
        verdict: "Skip",
        verdictWhy: "Product demo with a paper attached.",
        title: "Chat-with-PDF: A Browser Sidebar for arXiv",
        authors: "mock",
        takeaway: "A Chrome extension, written up as a methods paper.",
        takeaways: ["Not research you need this morning."],
        actions: ["Install it or don’t. Don’t put it on the board."],
      },
      {
        id: "t12",
        arxivId: "2608.17110",
        url: "https://arxiv.org/abs/2608.17110",
        topic: "AI",
        verdict: "Watch",
        verdictWhy: "Single-list, low-vote agent wrapper. SemaPLC already covers harnesses.",
        title: "WrapAgent: A Thin ReAct Loop Around Tool APIs",
        authors: "mock",
        takeaway: "ReAct with retries. One community list, no second watch.",
        takeaways: ["Covered better elsewhere on this board."],
        actions: ["Only if you have never seen a ReAct loop."],
      },
    ],
  },
  {
    date: "2026-08-19",
    label: "Yesterday · Wed 19 Aug",
    minutes: 8,
    papers: [
      {
        id: "p1",
        arxivId: "2509.08721",
        url: "https://arxiv.org/abs/2509.08721",
        topic: "AI",
        verdict: "Watch",
        verdictWhy: "Eval incentives, not a model you can ship.",
        title: "Why Language Models Hallucinate",
        authors: "Kalai et al.",
        takeaway:
          "Hallucinations persist because tests reward guessing over abstention.",
        takeaways: [
          "Binary grading gives zero credit for “I don’t know.”",
          "Singleton training facts are a lower bound, not a mystery.",
          "Fix existing leaderboards rather than adding another hallucination bench.",
        ],
        actions: [
          "If you ship an assistant, score abstention in your evals.",
          "Do not wait for a new “hallucination quiz” to change behavior.",
        ],
      },
      {
        id: "p2",
        arxivId: "2508.11201",
        url: "https://arxiv.org/abs/2508.11201",
        topic: "AI",
        verdict: "Try",
        verdictWhy: "Public weights and a runnable recipe.",
        title: "SimpleVLA-RL: Scaling VLA Training via Reinforcement Learning",
        authors: "He et al.",
        takeaway:
          "A small RL loop on a vision-language-action model beats the supervised baseline on the authors’ suite.",
        takeaways: [
          "The gain is on their tasks; compute is not matched to SOTA VLAs.",
          "Code and weights are linked from the abstract page.",
          "Useful if you already have a VLA stack, not as a from-scratch bet.",
        ],
        actions: [
          "Clone the repo before you rewrite the method.",
          "Do not change production until someone replicates off their suite.",
        ],
      },
      {
        id: "p3",
        arxivId: "econ-001",
        url: "https://www.nber.org/papers/w32901",
        topic: "Econ",
        verdict: "Watch",
        verdictWhy: "Identification is the paper; not a number to copy.",
        title: "Remote Work and the Spatial Distribution of Wages",
        authors: "NBER working paper (mock)",
        takeaway:
          "Wage convergence across metros is mostly composition, not remote-work bargaining.",
        takeaways: [
          "The design uses a shift-share on pre-2020 occupational mix.",
          "Headline “remote flattened wages” does not survive the composition control.",
          "Policy takeaway is weaker than the tweets.",
        ],
        actions: [
          "If you model local labor markets, keep the composition term.",
          "Skip if you wanted a remote-work how-to.",
        ],
      },
      {
        id: "p4",
        arxivId: "2508.20011",
        url: "https://arxiv.org/abs/2508.20011",
        topic: "Stats",
        verdict: "Try",
        verdictWhy: "Cleaner conformal coverage under shift, with code.",
        title: "Conformal Prediction under Delayed Feedback",
        authors: "Liu, Shah",
        takeaway:
          "Standard split conformal undercover when labels arrive late; a delayed-feedback correction restores nominal coverage in their simulations.",
        takeaways: [
          "The fix is a reweighted quantile, not a new model class.",
          "Assumes you can estimate the delay distribution.",
          "Code notebook is linked.",
        ],
        actions: [
          "If you already use conformal for production intervals, read §3.",
          "Skip if your labels are not delayed.",
        ],
      },
      {
        id: "p5",
        arxivId: "2508.17702",
        url: "https://arxiv.org/abs/2508.17702",
        topic: "Math",
        verdict: "Skip",
        verdictWhy: "Survey of known bounds; no new theorem for practitioners.",
        title: "A Survey of Discrete Curvature on Graphs",
        authors: "Chen",
        takeaway:
          "Organizes Ollivier, Forman, and resistance curvatures; does not resolve which to use for GNNs.",
        takeaways: [
          "Useful as a map if you are already in the area.",
          "No empirical GNN section.",
        ],
        actions: ["Bookmark if you write geometric DL. Otherwise skip."],
      },
      {
        id: "p6",
        arxivId: "med-002",
        url: "https://www.medrxiv.org/content/10.1101/2026.08.01.example",
        topic: "Health",
        verdict: "Watch",
        verdictWhy: "Preprint, small n, interesting endpoint.",
        title: "Wearable-detected AF burden and 90-day stroke in a pragmatic cohort",
        authors: "mock medRxiv",
        takeaway:
          "Higher AF burden on a consumer wearable associated with stroke; residual confounding is the story.",
        takeaways: [
          "n is modest; EHR linkage is incomplete.",
          "Not a reason to change anticoagulation rules this week.",
        ],
        actions: [
          "Watch for the peer-reviewed version.",
          "Do not cite as causal in a product spec.",
        ],
      },
    ],
  },
  {
    date: "2026-08-18",
    label: "Tue 18 Aug",
    minutes: 6,
    papers: [
      {
        id: "p7",
        arxivId: "2508.09901",
        url: "https://arxiv.org/abs/2508.09901",
        topic: "AI",
        verdict: "Try",
        verdictWhy: "Independent code, matched compute in one setting.",
        title: "Fast-dLLM v2: Efficient Block-Diffusion LLM",
        authors: "Wu et al.",
        takeaway:
          "Block diffusion decoding cuts latency at similar quality on their English suite.",
        takeaways: [
          "The interesting number is latency at fixed quality, not a new SOTA on MMLU.",
          "Repo is active this week.",
        ],
        actions: ["If you serve a dLLM, this is the PDF to open."],
      },
      {
        id: "p8",
        arxivId: "stat-018",
        url: "https://arxiv.org/abs/2508.14002",
        topic: "Stats",
        verdict: "Skip",
        verdictWhy: "2% on a saturated bench, no code.",
        title: "Yet Another Bootstrap for Heteroskedastic Panels",
        authors: "mock",
        takeaway: "Coverage is slightly better in one Monte Carlo grid.",
        takeaways: ["No software. Grid is narrow."],
        actions: ["Skip unless this is your exact estimator."],
      },
      {
        id: "p9",
        arxivId: "econ-002",
        url: "https://arxiv.org/abs/2508.13040",
        topic: "Econ",
        verdict: "Watch",
        verdictWhy: "Theory paper; wait for empirics.",
        title: "Platform Bargaining with Data Externalities",
        authors: "mock",
        takeaway:
          "A model where data network effects flip who captures surplus in two-sided markets.",
        takeaways: ["No estimation. Clean comparative statics."],
        actions: ["Relevant if you write platform antitrust memos."],
      },
    ],
  },
  {
    date: "2026-08-17",
    label: "Mon 17 Aug",
    minutes: 7,
    papers: [
      {
        id: "p10",
        arxivId: "2508.08888",
        url: "https://arxiv.org/abs/2508.08888",
        topic: "AI",
        verdict: "Watch",
        verdictWhy: "Weather card: everyone is arguing; here is a fair claim.",
        title: "GDPval: Evaluating AI on Economically Valuable Tasks",
        authors: "OpenAI (mock listing)",
        takeaway:
          "Tasks from real occupations; grading is pairwise expert preference, not a unit test.",
        takeaways: [
          "Useful as a direction, not as your internal scoreboard yet.",
          "Gold subset is small.",
        ],
        actions: ["Read if you build evals. Don’t retrofit your CI to this."],
      },
      {
        id: "p11",
        arxivId: "health-017",
        url: "https://www.biorxiv.org/content/10.1101/2026.08.17.example",
        topic: "Health",
        verdict: "Try",
        verdictWhy: "Methods paper with a notebook.",
        title: "A simple negative-control checklist for EHR phenotyping",
        authors: "mock bioRxiv",
        takeaway:
          "Four checks that catch the usual leakage in phenotype labels.",
        takeaways: ["Low ceremony. Aimed at applied teams."],
        actions: ["If you train on EHR labels, open this before the next run."],
      },
      {
        id: "p12",
        arxivId: "math-017",
        url: "https://arxiv.org/abs/2508.12017",
        topic: "Math",
        verdict: "Watch",
        verdictWhy: "Short note; specialists only.",
        title: "On the stability of Sinkhorn for unbalanced transport",
        authors: "mock",
        takeaway: "A condition number bound that matches the balanced case up to a factor.",
        takeaways: ["No experiments."],
        actions: ["Open if you implement unbalanced OT."],
      },
    ],
  },
];

const extras: Record<
  string,
  Pick<Paper, "intake" | "tags" | "abstract"> &
    Partial<Pick<Paper, "github" | "notes" | "listing">>
> = {
  t1: {
    intake: "HF Daily",
    github: "https://github.com/air-embodied-brain/Zetta-Embodiment",
    tags: ["embodied", "harness", "robots"],
    listing: {
      listedOn: "2026-08-20",
      publishedOn: "2026-08-17",
      intakes: [
        {
          kind: "hf-daily",
          upvotes: 125,
          evidenceUrl: "https://huggingface.co/papers/2608.16590",
        },
      ],
    },
    abstract:
      "Embodied agents are increasingly used to close the gap left by end-to-end policy models. Yet the agentic path has not realized closed-loop learning in physical execution: existing harnesses remain largely open-loop, following fixed skills during rollout and reflecting only after an episode completes. Such post-hoc reflection cannot govern execution as it unfolds, because physical interaction requires decisions to track rapidly changing robot-environment states at a frequency beyond today's large agentic models. We present Zetta, a closed-loop embodied harness that evolves code-based runtime critics and recovery skills online while keeping the base policy frozen. Through three timescale-separated loops, Zetta provides action-frequency governance, rollout-level critic-recovery proposal, and validation-gated skill updates.",
    notes: [
      "The paper’s contrast with post-episode reflection, not a new policy architecture.",
      "Author stack; not a claim about your hardware.",
      "GitHub is on the Daily Papers card.",
    ],
  },
  t2: {
    intake: "HF Daily",
    tags: ["lineage", "open-weights", "security"],
    listing: {
      listedOn: "2026-08-20",
      publishedOn: "2026-08-14",
      intakes: [
        {
          kind: "hf-daily",
          upvotes: 15,
          evidenceUrl: "https://huggingface.co/papers/2608.14929",
        },
      ],
    },
    abstract:
      "Open-weight language models are fine-tuned, quantized, pruned, and merged, yet their provenance is often undocumented. We study data-free white-box lineage verification: can weights alone reveal whether two compatible model checkpoints share ancestry? Residual training produces a shared identity-aligned component in branch products, so this structure alone cannot establish ancestry. We remove it and compare checkpoint-specific structure across residual blocks, yielding a symmetric lineage score calibrated against independent checkpoints. On residual-MLP and GPT-2 benchmarks, the score separates fine-tuned, LoRA-merged, pruned, and quantized descendants from independent and distilled models. Under function-preserving checkpoint laundering, weight-space baselines lose margin or fail; the centered residual score remains unchanged.",
  },
  t3: {
    intake: "HF Daily",
    tags: ["looped-lm", "tools", "agents"],
    listing: {
      listedOn: "2026-08-20",
      publishedOn: "2026-08-17",
      intakes: [
        {
          kind: "hf-daily",
          upvotes: 13,
          evidenceUrl: "https://huggingface.co/papers/2608.18171",
        },
      ],
    },
    abstract:
      "Looped language models have shown promising results on reasoning benchmarks, yet their potential for agentic tool use remains largely unexplored. We study this question in compositional tool-calling settings, where models must coordinate multiple API calls, maintain intermediate state, and preserve dependencies across tool interactions. We evaluate native and retrofitted looped language models on API-Bank, BFCL, and NESTful, comparing looped and non-looped models trained under matched supervised fine-tuning recipes and varying recurrent depth at inference time. In controlled experiments, recurrent computation generally benefits compositional and dependency-aware tool use, while providing smaller and more model-dependent gains on isolated API invocation. Accuracy on multi-step tool use generally increases with recurrent depth; adaptive inference achieves a more favorable compute tradeoff.",
  },
  t4: {
    intake: "HF Daily",
    github: "https://github.com/midea-ai/SemaPLC",
    tags: ["codegen", "plc", "verification"],
    listing: {
      listedOn: "2026-08-20",
      publishedOn: "2026-08-19",
      intakes: [
        {
          kind: "hf-daily",
          upvotes: 110,
          evidenceUrl: "https://huggingface.co/papers/2608.18565",
        },
        {
          kind: "arxiv-new",
          evidenceUrl: "https://arxiv.org/abs/2608.18565",
        },
      ],
    },
    abstract:
      "Programmable logic controllers (PLCs) run industrial plants, and large language models can already generate independent program organization units (POUs) for them. Whether such logic integrates into an existing PLC project and then runs correctly has been checked only in limited tests. We present SemaPLC, a project-grounded and verification-gated agent harness assembled from conventional tools but governed by a strict completion rule. Rather than stopping when the model judges its own output adequate, SemaPLC declares a task complete only when logged external checks confirm it. Those checks cover the specification, the compilation, and the behavior on a live runtime. On 117 independent-POU tasks matching existing benchmarks, it attains the highest strict verified pass rate on all seven models (72.6% mean).",
  },
  t5: {
    intake: "arXiv",
    tags: ["experiments", "attrition", "pairwise"],
    listing: {
      listedOn: "2026-08-20",
      publishedOn: "2026-08-19",
      intakes: [
        {
          kind: "arxiv-new",
          evidenceUrl: "https://arxiv.org/abs/2608.18973",
        },
      ],
    },
    abstract:
      "Pairwise randomization can yield substantial efficiency gains in experiments. Yet methodological guidance cautions against pairwise randomization, especially in settings with attrition, partly because common practices for estimation (pair fixed effects) imply discarding data from incomplete pairs, thus exacerbating data loss from attrition. We argue that this concern is misplaced if attrition is independent of treatment status and potential outcomes, and that these issues follow from an inefficient use of the data that remains post-attrition. We show how a specific permutation test can use all observed units — complete pairs and incomplete pairs — while still exploiting the pairwise randomization design. The procedure provides exact size control under the sharp null.",
  },
  t6: {
    intake: "arXiv",
    tags: ["fda", "neural-operators", "functional-data"],
    listing: {
      listedOn: "2026-08-20",
      publishedOn: "2026-08-19",
      intakes: [
        {
          kind: "arxiv-new",
          evidenceUrl: "https://arxiv.org/abs/2608.19070",
        },
      ],
    },
    abstract:
      "This paper investigates the estimation of the regression operator in function-on-function regression models. While traditional research has predominantly focused on linear models or their immediate nonlinear extensions, we propose a neural operator approach to accommodate general regression operators under mild smoothness assumptions. Our methodology introduces the separable neural operator, a neural-operator architecture that represents the regression operator through input-dependent coefficient functions and output-dependent basis functions. We establish consistency of the estimator under relatively mild smoothness and sampling conditions, allowing functional data to be observed on dense, possibly irregular, discrete grids. We also apply the proposed approach to BGC Argo data.",
  },
  t7: {
    intake: "arXiv",
    tags: ["did", "mediators", "causal"],
    listing: {
      listedOn: "2026-08-20",
      publishedOn: "2026-08-18",
      intakes: [
        {
          kind: "arxiv-new",
          evidenceUrl: "https://arxiv.org/abs/2608.18375",
        },
      ],
    },
    abstract:
      "We study difference-in-differences (DiD) designs in which a binary treatment changes an endogenous time-varying mediator that in turn affects an outcome. Under our model assumptions, we show that the usual DiD estimand mixes the average direct effect on the treated, the average indirect effect, and a trend bias term. A two-way fixed effects regression that controls for the mediator does not recover the average direct treatment effect on the treated. We show that a DiD estimand conditional on the observed mediator path identifies the conditional average direct effect for treated units at that path, and that averaging over the treated path distribution identifies the average direct effect even when unconditional parallel trends fails. Existing doubly robust estimators can be used to conduct inference.",
  },
  t8: {
    intake: "arXiv",
    tags: ["af", "ecg", "wearables"],
    listing: {
      listedOn: "2026-08-20",
      publishedOn: "2026-08-19",
      intakes: [
        {
          kind: "arxiv-new",
          evidenceUrl: "https://arxiv.org/abs/2608.18451",
        },
      ],
    },
    abstract:
      "Reliable atrial fibrillation (AF) detection from electrocardiogram (ECG) signals remains challenging in real-world clinical settings due to variable lead configurations, cross-dataset domain shifts, and pervasive physiological and technical artifacts. We propose the Dual-Codebook Graph Collaborative Network (DCGCNet), an end-to-end vector-quantized variational autoencoder that jointly performs AF classification and ECG reconstruction. DCGCNet introduces a Local-Global Contrastive Module for learning noise-invariant representations and an Adaptive Codebook Vector Quantizer that refines codebook prototypes to prevent codebook collapse. The authors report strong intra-dataset 12-lead performance and cross-dataset generalization across seven diverse sources. This remains a methods result on public ECG corpora, not a prospective clinical evaluation.",
  },
  t9: {
    intake: "HF Daily",
    tags: ["instruction-tuning"],
    listing: {
      listedOn: "2026-08-20",
      publishedOn: "2026-08-09",
      intakes: [
        {
          kind: "hf-daily",
          upvotes: 6,
          evidenceUrl: "https://huggingface.co/papers/2608.14201",
        },
      ],
    },
    abstract:
      "We remix eight public instruction datasets and fine-tune an 8B model. MMLU rises 0.4 versus the previous mix. No new eval, no release.",
  },
  t10: {
    intake: "HF Daily",
    tags: ["scaling"],
    listing: {
      listedOn: "2026-08-20",
      publishedOn: "2026-08-09",
      intakes: [
        {
          kind: "hf-daily",
          upvotes: 48,
          evidenceUrl: "https://huggingface.co/papers/2608.13888",
        },
      ],
    },
    abstract:
      "We train a 1.3B transformer at several token budgets and plot a scaling curve. The curve is smooth. There is no comparison to published scaling literature beyond a citation.",
  },
  t11: {
    intake: "HF Daily",
    github: "https://github.com",
    tags: ["tools"],
    listing: {
      listedOn: "2026-08-20",
      publishedOn: "2026-08-12",
      intakes: [
        {
          kind: "hf-daily",
          upvotes: 71,
          evidenceUrl: "https://huggingface.co/papers/2608.15502",
        },
      ],
    },
    abstract:
      "We describe a browser sidebar that chunks PDFs and queries a hosted LLM. Latency and a user study of 11 colleagues are reported. This is a product writeup.",
  },
  t12: {
    intake: "HF Daily",
    tags: ["agents"],
    listing: {
      listedOn: "2026-08-20",
      publishedOn: "2026-08-17",
      intakes: [
        {
          kind: "hf-daily",
          upvotes: 9,
          evidenceUrl: "https://huggingface.co/papers/2608.17110",
        },
      ],
    },
    abstract:
      "WrapAgent is a ReAct loop with retries around JSON tool calls. We report success on a private 20-task suite. No public harness.",
  },
  p1: {
    intake: "lab RSS",
    tags: ["evals", "hallucination", "incentives"],
    abstract:
      "Like students facing hard exam questions, large language models sometimes guess when uncertain, producing plausible yet incorrect statements instead of admitting uncertainty. Such hallucinations persist even in state-of-the-art systems. We argue they arise because training and evaluation procedures reward guessing over acknowledging uncertainty. We analyze statistical causes in the modern pipeline: if incorrect statements cannot be distinguished from facts, hallucinations in pretrained models arise through ordinary statistical pressures. They then persist because most evaluations are graded like tests — guessing when uncertain improves reported accuracy. We propose modifying the scoring of existing, dominant benchmarks (confidence thresholds and penalties for wrong guesses) rather than adding yet another hallucination leaderboard.",
    notes: [
      "From how current multiple-choice evals are scored, not a new experiment.",
      "The singleton-facts argument in the paper; we are restating it.",
      "The authors’ proposed intervention, not an independent PaperScroll test.",
    ],
  },
  p2: {
    intake: "HF Daily",
    github: "https://github.com",
    tags: ["vla", "robotics", "rl"],
    abstract:
      "Vision-language-action (VLA) models are typically trained with large-scale behavior cloning, which is expensive to scale and brittle when the demonstration distribution shifts. We study a lightweight reinforcement-learning stage on top of a pretrained VLA: the policy is rolled out in simulation, rewarded for task success, and updated with a clipped surrogate. On the authors’ manipulation suite the RL stage improves success rate over the cloned baseline, with the largest gains on long-horizon variants. We release training code and weights. Limitations: compute is not matched to frontier VLAs, evaluation is in-distribution relative to the authors’ tasks, and we do not claim a new state of the art on public robot benchmarks.",
  },
  p3: {
    intake: "NBER",
    tags: ["labor", "wages", "remote"],
    abstract:
      "The rise of remote work was widely expected to flatten wage differences across U.S. metro areas by expanding the set of jobs workers can take without moving. Using a shift-share design based on pre-2020 occupational mix, we find that most of the observed convergence in nominal wages is accounted for by changes in workforce composition rather than a bargaining channel from remote work itself. After composition controls, residual geographic wage gaps remain large. The results caution against treating headline “remote flattened pay” facts as evidence that housing or tax policy can ignore location. (Working-paper mock for this UI preview.)",
  },
  p4: {
    intake: "arXiv",
    github: "https://github.com",
    tags: ["conformal", "uncertainty", "production"],
    abstract:
      "Split conformal prediction yields finite-sample coverage when calibration labels are i.i.d. with the test point. In many production systems labels arrive days later, so the calibration set is stale relative to the current score distribution. We formalize delayed-feedback conformal prediction and show that the usual quantile undercover under a simple delay model. A reweighted quantile that uses an estimate of the delay distribution restores nominal coverage in simulations and on two public delayed-label datasets. The method does not change the underlying model class. It assumes the delay mechanism is identifiable from historical data; if delay is confounded with the label itself, coverage guarantees fail. Code and a notebook are included.",
  },
  p5: {
    intake: "arXiv",
    tags: ["graphs", "geometry", "survey"],
    abstract:
      "Discrete curvature has been proposed as a graph descriptor for clustering, comparison, and message passing. This survey organizes Ollivier-Ricci, Forman, and resistance-based curvatures, states the known comparison inequalities, and collects computational complexities. We do not prove new theorems and we do not run GNN experiments. The paper is a map of the literature: which definition is local, which requires solving transport problems, and where existing implementations disagree on sign conventions. Practitioners looking for a “use this curvature in your GNN” recipe will not find one here.",
  },
  p6: {
    intake: "medRxiv",
    tags: ["wearables", "stroke", "observational"],
    abstract:
      "Atrial fibrillation (AF) burden measured on consumer wearables is increasingly available, but its relationship to near-term stroke in routine care is unclear. In a pragmatic cohort linked to EHR outcomes, higher AF burden was associated with 90-day ischemic stroke after adjustment for CHA₂DS₂-VASc components. Residual confounding is likely: wearable use is selected, EHR linkage is incomplete, and we cannot separate burden from detection frequency. This is not evidence to change anticoagulation thresholds. We report the association, negative-control outcomes, and the missingness pattern so later studies can reuse the phenotype. (Preprint mock for this UI preview.)",
  },
  p7: {
    intake: "HF Daily",
    github: "https://github.com",
    tags: ["diffusion", "serving", "latency"],
    abstract:
      "Diffusion language models can match autoregressive quality but are often slower at decode. Fast-dLLM v2 uses block diffusion with a learned cache so several tokens are refined per step. On the authors’ English generation suite, wall-clock latency falls at matched perplexity versus a strong AR baseline; the quality gap on long-form tasks is small. We report hardware, batch size, and the exact decoding hyperparameters. Independent code is public. We do not claim SOTA on MMLU. The useful number is latency at fixed quality for people already serving a diffusion LM.",
  },
  p8: {
    intake: "arXiv",
    tags: ["bootstrap", "panels"],
    abstract:
      "We propose a wild-bootstrap variant for panel models with heteroskedasticity of unknown form. In a Monte Carlo grid with N ≤ 200 and T ≤ 50, coverage of a scalar coefficient is a few points closer to nominal than a clustered sandwich. There is no accompanying software, the grid does not include large T, and we do not compare to recently proposed web-bootstrap methods. The paper is incremental relative to the existing clustered-bootstrap literature.",
  },
  p9: {
    intake: "arXiv",
    tags: ["platforms", "theory"],
    abstract:
      "We study a two-sided platform where a firm bargains with users over access to a data network effect. In the model, the sign of the surplus split can flip when data externalities are strong enough that single-homing users impose a congestion-like cost on the other side. We provide comparative statics and a simple example; there is no estimation and no calibration to a named market. The paper is a theoretical lens for platform antitrust, not a measurement of any actual marketplace.",
  },
  p10: {
    intake: "lab RSS",
    tags: ["evals", "occupations", "gdp"],
    abstract:
      "Most model evals are unit tests. GDPval instead scores models on tasks drawn from occupations that account for a large share of U.S. GDP, written by practitioners with years of domain experience. Grading is pairwise expert preference on a gold subset, not exact-match. We document occupation mix, task construction, and known biases (U.S.-centric, expert raters). The benchmark is a direction for “economically valuable work,” not a drop-in replacement for a team’s internal scoreboard. The gold set is small; treating the headline ranking as a stable leaderboard would be a mistake.",
  },
  p11: {
    intake: "bioRxiv",
    github: "https://github.com",
    tags: ["ehr", "phenotyping", "methods"],
    abstract:
      "EHR-derived phenotype labels leak future information, collapse rule-out diagnoses, and encode site-specific coding habits. We describe four negative-control checks — calendar-time shuffle, post-outcome code exclusion, rare-code sensitivity, and cross-site transport — that catch the usual failure modes before a model is trained. A notebook implements the checks on a public MIMIC-derived schema. This is a methods note, not a new phenotype ontology. Teams already training on EHR labels can run the checklist in an afternoon.",
  },
  p12: {
    intake: "arXiv",
    tags: ["ot", "sinkhorn"],
    abstract:
      "Sinkhorn’s algorithm for entropic optimal transport is widely used; the unbalanced (KL-penalized mass) variant is less well understood numerically. We prove a condition-number bound for the unbalanced linear system that matches the balanced case up to a factor depending on the KL penalty. There are no experiments. The note is for people implementing unbalanced OT who need a stability guarantee, not a new algorithm.",
  },
};

/** Host briefs for live-pool papers that are not in an archive edition row. */
const liveHostBriefs: Paper[] = [
  {
    id: "2608.18417",
    arxivId: "2608.18417",
    url: "https://arxiv.org/abs/2608.18417",
    topic: "Stats",
    verdict: "Watch",
    verdictWhy:
      "Matching at Criteo scale with an explicit support diagnostic. Not a license to skip pairwise matching on ordinary n.",
    title:
      "Centroid-Referenced Mahalanobis Matching (CRM): A Scalable, Representation-Based Framework for Causal Inference in Large Observational Studies",
    authors: "Hu, He",
    takeaway:
      "Match in two treated-centroid coordinates (Mahalanobis radius plus Fisher direction) instead of global pairs, and report how much of the treated population you quietly dropped.",
    brief:
      "Pairwise Mahalanobis matching dies at ads-scale n, and calipers quietly rewrite the target population. Hu and He replace the global search with stratified sampling in two coordinates defined by the treated sample: distance from the treated centroid in the treated covariance, and the Fisher direction of the treated–control mean shift. That is a representation of the original covariates, not PCA-then-match.\n\nThe selling points are cost and honesty. Implemented runtime is O(np²+p³+n log n). A pre-match shortage fraction estimates how much of the treated support you cannot cover; they bound the gap that creates, and they report capacity-driven drops separately from the representation. On Criteo they keep almost all treated units and beat a corrected propensity matcher on MaxSMD in most large-n configs. Moderate-n simulations still favor some pairwise and weighting methods on balance. There is no software named in the abstract.\n\nOpen this if you already match (or weight) at millions of rows and need a support diagnostic you can put in the paper. Skip it if your n still fits a standard matching library — they are not claiming dominance there.",
    takeaways: [
      "The two coordinates are treated-geometry, not a generic dimension reduction. If you PCA first, you are not running CRM.",
      "The shortage fraction is the part to steal even if you never use their matcher. A lot of matching papers hide who left the sample.",
      "Criteo is the regime. Their own simulations say pairwise methods can still win on smaller problems.",
    ],
    plain: {
      verdictWhy:
        "Matching at Criteo scale, with an honest count of who you quietly dropped. Not a reason to skip ordinary pairwise matching on small n.",
      brief:
        "Pairwise matching — find each treated person a similar control — dies when n is ads-scale, and calipers quietly change who is still in the study. Hu and He replace the global search with sampling in two coordinates defined by the treated sample: how far from the treated center, and the direction of the treated-versus-control mean shift. That is a compression of the original covariates, not “PCA then match.”\n\nThe selling points are cost and honesty. Runtime is on the order of n times p², plus a cheap log-n sort. Before matching they estimate how much of the treated population you cannot cover; they bound the error that creates, and they report capacity-driven drops separately from the representation. On Criteo they keep almost all treated units and beat a corrected propensity matcher on a balance metric in most large-n setups. On moderate n, pairwise and weighting methods can still win. No software is named in the abstract.\n\nOpen this if you already match or weight at millions of rows. Skip it if your n still fits a standard matching library — they are not claiming dominance there.",
      takeaways: [
        "The two coordinates come from treated geometry, not generic dimension reduction. If you PCA first, you are not running CRM.",
        "The shortage fraction is the part to steal even if you never use their matcher. A lot of matching papers hide who left the sample.",
        "Criteo is the regime. Their own simulations say pairwise methods can still win on smaller problems.",
      ],
    },
    actions: [
      "If you have a large observational file and a matching step, read the error decomposition and the shortage diagnostic before you copy the algorithm.",
      "If your current n is a few thousand, keep the pairwise matcher you already trust.",
    ],
    intake: "arXiv",
    tags: ["matching", "causal", "scale"],
  },
];

const briefsByArxiv = new Map<string, Paper>();
for (const paper of liveHostBriefs) {
  briefsByArxiv.set(paper.arxivId, paper);
}

for (const edition of editions) {
  const papers = edition.papers
    .map((paper) => ({
      intake: "arXiv" as const,
      tags: [] as string[],
      abstract: "",
      ...paper,
      ...extras[paper.id],
    }))
    .filter((paper) => belongsOnBoard(paper, edition.date));
  for (const paper of papers) {
    if (paper.brief) briefsByArxiv.set(paper.arxivId, paper);
  }
}

const poolModules = import.meta.glob("./pools/*.json", {
  eager: true,
  import: "default",
}) as Record<string, MorningPool>;

const liveEditions = Object.values(poolModules).flatMap((pool) => {
  const slate = HOSTED_SLATES[pool.boardDate];
  if (!slate?.length) return [];
  const edition = editionFromPool(pool, briefsByArxiv, slate);
  return edition.papers.length ? [edition] : [];
});
export const catalog: Edition[] = [...liveEditions].sort(
  (a, b) => b.date.localeCompare(a.date),
);

export function findPaper(id: string) {
  for (const edition of catalog) {
    const paper = edition.papers.find(
      (item) => item.id === id || item.arxivId === id,
    );
    if (paper) return { paper, edition };
  }
  return null;
}
