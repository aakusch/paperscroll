export type DemoPaper = {
  topic: string;
  arxivId: string;
  title: string;
  authors: string;
  listed: string;
  abstract: string;
  rank?: number;
  votes?: number;
  perDay?: number;
  code?: boolean;
  verdict?: "Try" | "Watch" | "Skip";
  actions?: string[];
  fieldWhy: string;
  plainWhy: string;
  fieldBody: string;
  plainBody: string;
  fieldTakes: string[];
  plainTakes: string[];
};

export const boardPapers: DemoPaper[] = [
  {
    topic: "AI",
    arxivId: "2608.16590",
    title: "Zetta ζ: An Efficient Closed-Loop Embodied Harness for Self-Evolving Physical Intelligence",
    authors: "Ding et al.",
    listed: "First appeared 17 Aug",
    abstract:
      "Embodied agents are increasingly used to close the gap left by end-to-end policy models. Yet the agentic path has not realized closed-loop learning in physical execution: existing harnesses remain largely open-loop, following fixed skills during rollout and reflecting only after an episode completes. Such post-hoc reflection cannot govern execution as it unfolds, because physical interaction requires decisions to track rapidly changing robot-environment states at a frequency beyond today's large agentic models. We present Zetta, a closed-loop embodied harness that evolves code-based runtime critics and recovery skills online while keeping the base policy frozen. Through three timescale-separated loops, Zetta provides action-frequency governance, rollout-level critic-recovery proposal, and validation-gated skill updates.",
    rank: 2,
    votes: 128,
    perDay: 43,
    code: true,
    fieldWhy: "Closed-loop robot harness. Useful if you already ship skills on hardware.",
    plainWhy: "A supervisor that watches a robot while it moves, not after the run.",
    fieldBody:
      "Most embodied agents still run open-loop: they pick a skill, execute it, and only reflect when the episode is over. Zetta’s claim is that this is the wrong timescale for a robot. They freeze the base policy and evolve code-based runtime critics and recovery skills online, through three nested loops. The artifact is the public harness, not a new SOTA policy.",
    plainBody:
      "Most robot agents pick a skill, run it to the end, and only think afterwards. That is too late: the physical world changes faster than a large model can write a postmortem. Zetta leaves the main control policy alone and writes small programs that criticize the current move. Those only stick after a validation gate.",
    fieldTakes: [
      "The contribution is a harness, not a better end-to-end policy.",
      "The validation gate is doing the product work.",
      "Clone if you already run an embodied stack.",
    ],
    plainTakes: [
      "A live supervisor, not a better robot brain.",
      "Skills only stick after logged checks.",
      "Not a from-scratch bet if you have no robot.",
    ],
  },
  {
    topic: "AI",
    arxivId: "2608.14929",
    title: "Training Leaves Traces: Centered Residual Signatures for Language Model Lineage Verification",
    authors: "Thakur, Khoury",
    listed: "First appeared 14 Aug",
    abstract:
      "Open-weight language models are fine-tuned, quantized, pruned, and merged, yet their provenance is often undocumented. We study data-free white-box lineage verification: can weights alone reveal whether two compatible model checkpoints share ancestry? Residual training produces a shared identity-aligned component in branch products, so this structure alone cannot establish ancestry. We remove it and compare checkpoint-specific structure across residual blocks, yielding a symmetric lineage score calibrated against independent checkpoints. On residual-MLP and GPT-2 benchmarks, the score separates fine-tuned, LoRA-merged, pruned, and quantized descendants from independent and distilled models. Under function-preserving checkpoint laundering, weight-space baselines lose margin or fail; the centered residual score remains unchanged.",
    rank: 6,
    votes: 81,
    perDay: 12,
    code: false,
    verdict: "Try",
    actions: [
      "Implement the score on two known relatives and one unrelated checkpoint.",
      "Put the PDF beside the provenance field in your open-weights ingest.",
    ],
    fieldWhy: "Weight-space lineage check you can run on two checkpoints.",
    plainWhy: "A check, from the weights alone, on whether two models share a family tree.",
    fieldBody:
      "Open-weight models get fine-tuned, quantized, pruned, and merged, and the “this is a Llama descendant” field is often a rumor. They discard the shared residual identity and score leftover block-wise structure against independent checkpoints. Distillation looks unrelated — which is what you want for license and provenance. There is no repo on the HF card, so “Try” means implement from the PDF.",
    plainBody:
      "Open models get edited and mashed together, and the “this came from Llama” line is often gossip. Looking only at the numbers in two checkpoints, can you tell if they share ancestry? Distilled copies are treated as strangers on purpose. There is no code on the Hugging Face card, so this is an afternoon of implementation, not a pip install.",
    fieldTakes: [
      "This is provenance, not quality. A high score does not mean the model is safe.",
      "Distillation is a negative: a behavioral clone should look unrelated.",
      "You will write the checker. Start with two known relatives and one stranger.",
    ],
    plainTakes: [
      "Family history, not a safety grade. Related is not the same as good.",
      "A copycat that only matches behavior should fail the test. That is the point.",
      "Budget an afternoon. Two cousins and one unrelated checkpoint as a sanity check.",
    ],
  },
  {
    topic: "AI",
    arxivId: "2608.18171",
    title: "Looped Language Models Improve Compositional Tool Calling",
    authors: "Popescu, Sáez de Ocáriz Borde, Liò",
    listed: "First appeared 17 Aug",
    abstract:
      "Looped language models have shown promising results on reasoning benchmarks, yet their potential for agentic tool use remains largely unexplored. We study this question in compositional tool-calling settings, where models must coordinate multiple API calls, maintain intermediate state, and preserve dependencies across tool interactions. We evaluate native and retrofitted looped language models on API-Bank, BFCL, and NESTful, comparing looped and non-looped models trained under matched supervised fine-tuning recipes and varying recurrent depth at inference time.",
    rank: 10,
    votes: 14,
    perDay: 5,
    code: false,
    fieldWhy: "Looped LMs help multi-step tools. Isolated API calls, less so.",
    plainWhy: "Extra thinking helps when tools depend on one another, not for every API call.",
    fieldBody:
      "Matched SFT comparisons on API-Bank, BFCL, and NESTful isolate recurrent depth at inference. The useful effect is concentrated in compositional, dependency-aware calls. Adaptive depth improves the compute curve; fixed deep loops spend the same budget on easy turns.",
    plainBody:
      "When one tool call supplies the next tool’s input, another pass can help. A single weather lookup gains less. The useful product idea is to spend extra turns only on the chains that need them.",
    fieldTakes: [
      "Single-call evals understate the method; the gain is on chains.",
      "Matched SFT is the comparison to audit.",
      "Adaptive depth is the part to steal.",
    ],
    plainTakes: [
      "Extra turns help when calls depend on earlier calls.",
      "Do not pay that cost on every easy request.",
      "No public training recipe is attached.",
    ],
  },
  {
    topic: "AI",
    arxivId: "2608.18565",
    title: "SemaPLC: A Project-Grounded, Verification-Gated Agent Harness for PLC Code Generation",
    authors: "Tu et al.",
    listed: "First appeared 19 Aug",
    abstract:
      "Programmable logic controllers (PLCs) run industrial plants, and large language models can already generate independent program organization units (POUs) for them. Whether such logic integrates into an existing PLC project and then runs correctly has been checked only in limited tests. We present SemaPLC, a project-grounded and verification-gated agent harness assembled from conventional tools but governed by a strict completion rule. Rather than stopping when the model judges its own output adequate, SemaPLC declares a task complete only when logged external checks confirm it. Those checks cover the specification, the compilation, and the behavior on a live runtime. On 117 independent-POU tasks matching existing benchmarks, it attains the highest strict verified pass rate on all seven models (72.6% mean).",
    rank: 3,
    votes: 110,
    perDay: 110,
    code: true,
    verdict: "Try",
    fieldWhy: "Verification-gated PLC codegen. The agent does not get to declare success.",
    plainWhy: "Factory code is not finished until a live controller says it ran.",
    fieldBody:
      "Independent-POU numbers are the easy track. A second track of 65 project-context tasks requires the generated logic to compile and run inside a real project. That is the paper. GitHub is listed (midea-ai/SemaPLC).",
    plainBody:
      "The product is the completion rule, not another coding model. Standalone routines are the easy exam; the in-project track is what to read before quoting 72.6%. Clone the harness if you already have a compiler in the loop.",
    fieldTakes: [
      "If your eval is “the model said it worked,” you are measuring the wrong thing.",
      "Read the in-project track before you quote 72.6%.",
      "GitHub is listed (midea-ai/SemaPLC).",
    ],
    plainTakes: [
      "External logs declare done, not the model.",
      "Standalone routines are the easy exam.",
      "Clone the harness if you already have a compiler in the loop.",
    ],
  },
  {
    topic: "Stats",
    arxivId: "2608.18973",
    title: "Don't Drop the Singletons: Efficient Inference for Pairwise Experiments with Independent Attrition",
    authors: "Heß, Schmidt",
    listed: "First appeared 19 Aug",
    abstract:
      "Pairwise randomization can yield substantial efficiency gains in experiments. Yet methodological guidance cautions against pairwise randomization, especially in settings with attrition, partly because common practices for estimation (pair fixed effects) imply discarding data from incomplete pairs, thus exacerbating data loss from attrition. We argue that this concern is misplaced if attrition is independent of treatment status and potential outcomes, and that these issues follow from an inefficient use of the data that remains post-attrition. We show how a specific permutation test can use all observed units — complete pairs and incomplete pairs — while still exploiting the pairwise randomization design. The procedure provides exact size control under the sharp null.",
    code: false,
    verdict: "Try",
    fieldWhy: "Stops you throwing away incomplete pairs after attrition.",
    plainWhy: "Keep the leftover person when their pair-mate leaves the study.",
    fieldBody:
      "Pair FE plus dropping incomplete pairs is the inefficient bit, not pairing itself.",
    plainBody:
      "Textbooks blamed pairing. This paper blames the estimator.",
    fieldTakes: [
      "Fix the estimator before you abandon pairing.",
      "Exact size under the sharp null is the sentence to check.",
      "Independent attrition is an assumption you should try to falsify.",
    ],
    plainTakes: [
      "Do not throw away people because their pair-mate left.",
      "Dropout caused by treatment is a different paper.",
      "If you never pair units, walk on.",
    ],
  },
  {
    topic: "Math",
    arxivId: "2608.19070",
    title: "Function-On-Function Regression Through Separable Neural Operators",
    authors: "Hsing, Huang, Morimoto",
    listed: "First appeared 19 Aug",
    abstract:
      "This paper investigates the estimation of the regression operator in function-on-function regression models. While traditional research has predominantly focused on linear models or their immediate nonlinear extensions, we propose a neural operator approach to accommodate general regression operators under mild smoothness assumptions. Our methodology introduces the separable neural operator, a neural-operator architecture that represents the regression operator through input-dependent coefficient functions and output-dependent basis functions. We establish consistency of the estimator under relatively mild smoothness and sampling conditions, allowing functional data to be observed on dense, possibly irregular, discrete grids. We also apply the proposed approach to BGC Argo data.",
    code: false,
    fieldWhy: "Consistency for a neural operator on function-on-function regression.",
    plainWhy: "A theorem for predicting one whole curve from another.",
    fieldBody:
      "Separable neural operator: input-dependent coefficients times output-dependent bases, irregular dense grids allowed.",
    plainBody:
      "Specialists only. The object is FDA, not a PINN leaderboard.",
    fieldTakes: [
      "Read it as statistics of functional data.",
      "Irregular dense grids are the practical clause.",
      "No artifact. You will reimplement.",
    ],
    plainTakes: [
      "Statistics of functions, not “we solved PDEs.”",
      "Messy grids are allowed. That matters.",
      "No code.",
    ],
  },
  {
    topic: "Econ",
    arxivId: "2608.18375",
    title: "Difference-in-Differences Models in the Presence of Time-Varying Mediators",
    authors: "Ban, Chen, Kédagni",
    listed: "First appeared 18 Aug",
    abstract:
      "We study difference-in-differences (DiD) designs in which a binary treatment changes an endogenous time-varying mediator that in turn affects an outcome. Under our model assumptions, we show that the usual DiD estimand mixes the average direct effect on the treated, the average indirect effect, and a trend bias term. A two-way fixed effects regression that controls for the mediator does not recover the average direct treatment effect on the treated. We show that a DiD estimand conditional on the observed mediator path identifies the conditional average direct effect for treated units at that path, and that averaging over the treated path distribution identifies the average direct effect even when unconditional parallel trends fails. Existing doubly robust estimators can be used to conduct inference.",
    code: false,
    fieldWhy: "Usual DiD mixes direct, indirect, and trend bias when a mediator moves.",
    plainWhy: "Controlling for the middle variable is not conservative. It is a different mix.",
    fieldBody:
      "Condition on the observed mediator path. TWFE plus the mediator as a regressor does not recover the direct effect.",
    plainBody:
      "If your identification was TWFE plus a mediator, this is a methods stop.",
    fieldTakes: [
      "“Control for the mediator” is not conservative.",
      "The path-conditional estimand is the object.",
      "Railroad access is an illustration. Steal the estimand.",
    ],
    plainTakes: [
      "Three stories got mixed into one number.",
      "You need the mediator’s path in the data.",
      "Do not steal their historical conclusion.",
    ],
  },
  {
    topic: "Health",
    arxivId: "2608.18451",
    title: "Atrial Fibrillation Detection with Arbitrary Leads via a Codebook-Based Reconstruction-Classification Framework",
    authors: "Li et al.",
    listed: "First appeared 19 Aug",
    abstract:
      "Reliable atrial fibrillation (AF) detection from electrocardiogram (ECG) signals remains challenging in real-world clinical settings due to variable lead configurations, cross-dataset domain shifts, and pervasive physiological and technical artifacts. We propose the Dual-Codebook Graph Collaborative Network (DCGCNet), an end-to-end vector-quantized variational autoencoder that jointly performs AF classification and ECG reconstruction. DCGCNet introduces a Local-Global Contrastive Module for learning noise-invariant representations and an Adaptive Codebook Vector Quantizer that refines codebook prototypes to prevent codebook collapse. The authors report strong intra-dataset 12-lead performance and cross-dataset generalization across seven diverse sources. This remains a methods result on public ECG corpora, not a prospective clinical evaluation.",
    code: false,
    fieldWhy: "Lead-agnostic AF detector. Cross-dataset is the result; clinic is not.",
    plainWhy: "Screening that survives missing leads — still not a trial.",
    fieldBody:
      "Dual-codebook VAE classifies AF and reconstructs ECG. Watch, do not ship.",
    plainBody:
      "Methods SOTA on PhysioNet-style sets has a long history of dying in the ward.",
    fieldTakes: [
      "Reconstruction plus classification is regularization.",
      "Seven-dataset generalization is the result to audit.",
      "No prospective n. Not a 510(k) narrative.",
    ],
    plainTakes: [
      "The model has to explain the waveform, not just say AF.",
      "Ask whether it was leave-one-dataset-out.",
      "Watch for a trial, or run one.",
    ],
  },
  {
    topic: "Stats",
    arxivId: "2608.18417",
    title:
      "Centroid-Referenced Mahalanobis Matching (CRM): A Scalable, Representation-Based Framework for Causal Inference in Large Observational Studies",
    authors: "Hu, He",
    listed: "First appeared 19 Aug",
    abstract:
      "Matching for causal inference can be computationally expensive at scale and can silently change the target population when overlap is limited. We propose Centroid-Referenced Mahalanobis Matching, which replaces global pairwise search with stratified sampling in two treated-reference coordinates and reports a pre-matching shortage fraction for limited support.",
    code: false,
    fieldWhy:
      "Matching at Criteo scale with an explicit support diagnostic. Not a license to skip pairwise matching on ordinary n.",
    plainWhy:
      "A faster matcher for enormous datasets that also tells you who the study had to leave out.",
    fieldBody:
      "Two treated-geometry coordinates replace global pairwise search. The shortage fraction is the reusable contribution; moderate-n simulations do not claim universal dominance.",
    plainBody:
      "Use it when ordinary matching is too large to run. Keep standard tools when they still fit, but steal the honest accounting of who could not be matched.",
    fieldTakes: [
      "The coordinates use treated covariance geometry, not generic PCA.",
      "Report shortage separately from capacity-driven drops.",
      "This is a scale result, not universal finite-sample dominance.",
    ],
    plainTakes: [
      "The speedup matters at millions of rows.",
      "The support check says who silently left the study.",
      "Use ordinary matching when it still fits.",
    ],
  },
];
