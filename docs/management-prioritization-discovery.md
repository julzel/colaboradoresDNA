# DNAture Personal Work Prioritization

## Product discovery

Date: September 7, 2026

Status: Approved for prototype implementation

Initial user: The developer responsible for DNAture’s technological resources

Audience: Technology lead and administration

Decision to inform: Whether to pilot a company-informed planning assistant and what that pilot must include

## 1 Purpose and recommendation

We want a tool that turns an unstructured description of work into an actionable, prioritized plan informed by DNAture’s objectives, challenges, and operating constraints. The user should be able to understand the proposed order, challenge it in conversation, and save a revised plan for execution and progress tracking.

The recommended starting point is a personal planning pilot for the technology lead. We should first organize a small, reviewed collection of company knowledge, then test whether that context improves prioritization compared with the user’s current approach and an assistant given only the task list. A broader roadmap tool for administrators and supervisors remains a possible later direction.

This document defines the opportunity, proposed experience, knowledge requirements, scope, and discovery activities. It does not commit DNAture to a model provider, delivery date, budget, or production architecture.

## 2 Problem and evidence

The stated need is to decide what deserves attention across competing responsibilities and to connect those decisions to company priorities. Capturing tasks alone does not explain which task matters most, what can start now, or whether a proposed sequence is sensible given dependencies and constraints.

The initial user wants to describe everything they need to do in a prompt, select a **Prioritize** action, and receive organized tasks with an explained order. They also want to suggest changes, justify disagreements, and receive feedback rather than simply overwrite the list.

The company information identified as potentially relevant includes its business description, products, human resources, challenges, and processes. The discussion has not yet established which records are current, who maintains them, or whether the objectives and challenges are documented in a form suitable for prioritization.

### Confirmed direction

- Begin with the technology lead’s own workload.
- Accept a freeform description instead of requiring structured task entry first.
- Use company objectives and challenges to inform the proposed order.
- Support a conversation about changes and their reasoning.
- Organize company knowledge before expanding the planning capability.
- Retain the longer-term interest in next actions, parallel work, and progress tracking.

### Assumptions to validate

- Priority decisions currently require enough time or effort to justify a dedicated tool.
- Administration can articulate objectives and resolve conflicts between them.
- Relevant company context changes the order of real tasks in useful ways.
- A maintained personal plan will fit the user’s daily habits.
- The benefit of better decisions will exceed the effort required to maintain context and task status.

No interviews with other administrators, measured planning baseline, or pilot results are available at this stage. Broader adoption and productivity improvements remain hypotheses.

## 3 Users and desired outcomes

The primary user is the technology lead, who needs to balance implementation, maintenance, operational support, and management requests. These work categories are illustrative and should be confirmed against a real backlog.

Administration is a proposed contributor and reviewer of company objectives and challenges. The technology lead should not need to infer company strategy from descriptive documents alone. Other administrators and supervisors are potential future users whose needs require separate discovery.

The central user need is:

> When I have competing responsibilities, I want to describe my workload and receive a justified sequence grounded in DNAture’s priorities, so I can decide what to do next and understand the tradeoffs.

The intended outcomes are less time spent organizing and reconsidering work, clearer connections between tasks and company objectives, fewer blocked starts, and a plan the user continues to maintain. Completing more tasks is not sufficient evidence of success if those tasks do not advance meaningful outcomes.

## 4 Proposed experience

### Prepare the context

Before the first planning session, review the company’s current objectives, active challenges, priority principles, and relevant constraints. The user adds their responsibilities, current commitments, and available time. If essential company priorities are missing, the tool should identify the gap and label any resulting plan as provisional.

### Capture the workload

The user enters a paragraph, rough list, or pasted notes. Optional information includes a planning horizon, deadlines, effort estimates, dependencies, and work already underway. The interface should not require the user to fill every field before receiving help.

### Prioritize and clarify

The **Prioritize** action extracts distinct tasks, identifies possible duplicates, and distinguishes executable tasks from larger initiatives that need a next action. It preserves the original input so the user can check what was interpreted.

When missing information could materially change the order, the assistant asks a focused question. Otherwise, it proposes a plan with visible assumptions. It must not silently omit an input item, invent an external deadline, or treat an inferred effort estimate as confirmed.

### Review the proposal

The first view is an ordered task list with a clear next action. A task detail view explains the relevant objective or operational obligation, the reason for its position, supporting context, dependencies, and unresolved questions.

Separate indicators distinguish **ready to start**, **blocked**, and **needs clarification**. Importance and readiness remain separate: an important task may be blocked while a smaller task can advance immediately.

### Discuss changes

The user can edit a task, request a different order, or explain a new constraint. The assistant acknowledges the new information, explains its effect, and presents the changes before acceptance. It may maintain a recommendation when a tradeoff remains, but the user retains the final choice.

Feedback applies to the current plan by default. Saving a persistent personal preference should be explicit. A proposed change to company objectives requires review by whoever is authorized to maintain them. Conversation history does not automatically retrain the model or become company policy.

### Accept and track

An **Accept plan** action saves the reviewed tasks and their order as the working plan. The user can mark tasks as ready, in progress, blocked, done, or cancelled. A blocked task records what it is waiting for; a completed task records a completion note when useful.

Reprioritization produces a new proposal and explains changes relative to the accepted plan. It preserves task identities and progress, does not recreate completed work, and does not silently reorder active commitments.

### Illustrative interaction

The following is a hypothetical scenario, not a statement of DNAture’s actual objectives or workload.

The user enters: “Fix the purchasing export, draft onboarding instructions, and evaluate a new inventory tool. I have four hours today.” If a reviewed company objective concerns purchasing reliability, the assistant might recommend investigating the export first and show that objective as evidence. It should confirm the impact of the export problem rather than assume a business interruption.

The user replies: “The onboarding instructions are needed before a confirmed start tomorrow.” The assistant revises the order around that commitment and explains what would be delayed. If both tasks have unavoidable conflicting deadlines, it surfaces the conflict rather than promising an impossible schedule.

## 5 Proposed prioritization approach

Company context should help explain decisions, but descriptive knowledge alone cannot determine the tradeoffs management wants to make. We need explicit priority principles that the user and administration can review.

| Consideration          | Question the tool should address                                              |
| ---------------------- | ----------------------------------------------------------------------------- |
| Objective contribution | Which approved outcome or operational obligation does this task support?      |
| Urgency and delay      | What confirmed deadline or consequence makes timing matter?                   |
| Business impact        | What benefit, risk reduction, or service continuity is supported by evidence? |
| Dependencies           | What must happen first, and what does this task unblock?                      |
| Effort and capacity    | Is the next action feasible within the available time and resources?          |
| Evidence quality       | Which facts are confirmed, inferred, missing, or outdated?                    |

The proposed approach first checks hard constraints and dependencies, then compares ready tasks using these considerations. Blocked work remains visible in the priority order, but is not presented as immediately executable. Cyclic dependencies require correction or clarification.

For the pilot, qualitative explanations are preferable to an unvalidated numerical score. If scoring is introduced, its weights must be explicit, reviewed, and tested. A generated confidence percentage should not be presented as calibrated evidence.

Work without an objective link should not be discarded. Routine maintenance, essential support, and unavoidable commitments can be valid obligations. The assistant should label the relationship honestly rather than manufacture a strategic connection.

Suggestions for parallel work are conditional on independent dependencies and available people or resources. For a single person, they can identify useful work while waiting on an external dependency. They should not imply that the person can perform two focused tasks simultaneously or assign work to someone else without confirmation.

## 6 Minimum viable scope

### Include in the pilot

- One personal planning workspace for the technology lead.
- A small reviewed company context collection, maintained manually at first.
- Freeform workload intake and editable task extraction.
- A **Prioritize** action with explanations, source references, and visible assumptions.
- Focused clarification when material information is missing.
- Conversational revision, manual changes, and explicit plan acceptance.
- A saved ordered list with readiness, status, dependencies, and progress.
- Reprioritization that shows changes and preserves accepted task history.
- Basic measurement of planning time, recommendation quality, and operating cost.

The initial interface should follow the existing app’s header, card, and list patterns and work well on mobile. Integration into the current app is a candidate implementation path, subject to a technical review. An ordered list is sufficient for the pilot; a Kanban board can be tested if users need it for progress tracking.

### Defer from the pilot

- Company-wide scheduling, automatic delegation, and resource optimization.
- Autonomous task execution or commitments to other people and systems.
- Automatic changes to company strategy or approved objectives.
- Broad ingestion of HR records, private development notes, or all company documents.
- Training a custom model or fine-tuning from initial user feedback.
- Full project management features such as Gantt charts, time billing, or external tool synchronization.
- Predictive claims about business outcomes without supporting evidence.

## 7 Company knowledge preparation

Knowledge organization is the first discovery workstream. We should establish what the information means, who approves it, and how it stays current before selecting a retrieval database or ingestion pipeline.

### Separate context by purpose

| Context  | Minimum contents                                                                                                | Proposed responsibility                              |
| -------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Company  | Business overview, products, approved objectives, active challenges, priority principles, operating constraints | Administration validates; a named maintainer updates |
| Personal | Responsibilities, available time, commitments, relevant capabilities, explicit preferences                      | The individual user                                  |
| Plan     | Original input, extracted tasks, dependencies, estimates, conversation, accepted decisions, progress            | The individual user, supported by the application    |

These responsibilities are proposals to confirm. Personal explanations should not silently become shared company knowledge.

### Initial knowledge collection

Prepare a concise business overview and a small set of current objectives and challenges. Add only the process or product references needed to interpret the pilot backlog. Roles and availability may be relevant; confidential HR details should be excluded unless a specific, authorized use is established.

Each knowledge record should include a stable identifier, title, source or evidence, owner, approval status, access scope, version, last-reviewed date, and active or archived status. Time-sensitive records also need effective dates or a review date.

An objective should state the desired outcome, relative importance, horizon, accountable owner, and success measure. Targets that have not been agreed should remain marked as unknown. A challenge should describe the problem, observed impact, affected area, supporting evidence, and relationship to objectives.

### Preparation sequence

1. Inventory candidate sources and identify a responsible reviewer for each.
2. Extract current objectives, challenges, constraints, and priority principles into structured records.
3. Resolve conflicting or outdated statements with their owners; preserve unresolved conflicts visibly.
4. Review access boundaries and exclude unnecessary personal information.
5. Approve a small context collection for the pilot and give it a version.
6. Test it against a real backlog before expanding the collection.

The collection is ready when the pilot objectives and challenges are current or explicitly marked uncertain, their owners are identified, and their source references can be inspected. The user should be able to explain which missing fact could change a priority decision.

## 8 Role of the model and retrieval

Retrieval-augmented generation, or RAG, supplies relevant external information to a language model when it produces an answer. It does not require training the model on company documents. For this discovery, the proposal is to use an existing model with controlled access to approved context.

Current objectives, priority principles, and hard constraints should be supplied directly when the collection is small. Supporting process and product material can be retrieved as needed. A vector database is an option to evaluate when document volume or search needs justify it; it is not a prerequisite for the first experiment.

The conceptual request flow is:

1. Authenticate the user and load the accepted plan and authorized context.
2. Extract and validate tasks from the new input.
3. Supply current objectives and constraints; retrieve relevant supporting material if needed.
4. Generate a proposed order with reasoning and references.
5. Validate task identifiers, dependencies, required fields, and source references.
6. Present the proposal for clarification, revision, and acceptance.

Application logic should enforce permissions, record versions, validate dependencies, and persist accepted changes. The model should assist with interpretation, task decomposition, comparisons, explanations, and questions. Valid output formatting does not establish that a recommendation is correct; the pilot must assess the reasoning and evidence separately.

Each proposal should retain the context version, cited record versions, model and prompt configuration, and accepted changes needed to understand how the decision was reached. This supports investigation of inconsistent or outdated recommendations without promising identical model outputs on every run.

Retrieved material and pasted task text must be treated as information, not instructions that can change access rules or application behavior. Access filtering belongs before retrieval results reach the model. References must resolve to records the user can inspect.

If context is stale, contradictory, or unavailable, the tool should disclose the limitation, ask for clarification where necessary, and preserve the current plan. A failed model request must not lose the user’s input or overwrite accepted work.

Provider selection, data retention terms, logging, latency, and cost limits remain technical discovery decisions. Fine-tuning can be reconsidered only if evaluation reveals a repeatable behavior problem that simpler context and workflow changes do not address.

## 9 Minimum task and decision information

Each task should have a stable identifier, title, intended outcome or completion criterion, next action, status, and original input reference. The plan should distinguish the owner’s accepted position from any newly proposed position.

Optional or unknown fields include effort, deadline, dependency, blocker, related objective or obligation, and suggested planning window. Store whether material values were supplied by the user, drawn from an approved source, or inferred by the model. Do not require artificial precision to save a task.

A prioritization proposal should preserve its proposed order, explanation, context references, assumptions, outstanding questions, and changes from the current plan. Accepted revisions should record the user’s decision and reason when provided. Repeated acceptance must update the same tasks rather than create duplicates.

## 10 Alternatives and hypotheses

| Approach                                | What it would test                                            | Limitation to examine                                |
| --------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------- |
| Manual priority template                | Whether explicit criteria alone solve the problem             | Ongoing interpretation and ordering stay manual      |
| Assistant given only the backlog        | Whether task extraction and discussion provide enough value   | Company priorities must be restated or remain absent |
| Assistant with reviewed company context | Whether company knowledge improves decisions and explanations | Context preparation and maintenance add work         |

The proposed product is the third approach, but discovery should compare all three on the same backlogs. If company context does not improve the decisions, we should simplify the design or correct the context before investing in a larger RAG system.

Key hypotheses are that task extraction preserves the user’s intent, reviewed context improves priority reasoning, conversational correction reduces rework, and the saved plan remains useful during execution. Each can fail independently; a useful intake assistant does not by itself validate strategic prioritization.

## 11 Validation plan

### Establish a baseline

Use the technology lead’s current backlog to observe how priorities are set today. Record the time needed to organize it, the next selected action, important constraints, and what later caused changes. Do not assume that the current method or a reviewer’s first ordering is a perfect answer.

### Compare proposals

Use approximately ten representative backlog scenarios as a proposed initial test set. Include deadlines, dependencies, maintenance work, competing objectives, missing effort estimates, and conflicting information. Compare manual prioritization, an assistant without company context, and the context-informed version. Use the same inputs and review outputs without revealing the approach where practical.

The user and an administration reviewer, if available, should assess whether the order is defensible and constraints are respected. Review disagreement for new evidence or different priorities rather than treating exact agreement as the only measure of quality.

### Run a short usage pilot

If the comparison is promising, propose a two-week personal pilot. Capture time to an accepted plan, meaningful revisions, blocked starts, repeated usage, context maintenance effort, and model cost. The duration and test volume are discovery proposals, not delivery commitments.

| Measure              | Evidence to collect                                             | Proposed interpretation                                                      |
| -------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Task coverage        | Trace input items to extracted tasks or explicit clarification  | No silent loss, duplication, or invented commitments                         |
| Constraint handling  | Check confirmed deadlines, dependencies, and capacity           | No recommendation to start known blocked work or rely on impossible capacity |
| Grounding            | Inspect references and the claims they support                  | No fabricated sources; facts and assumptions remain distinguishable          |
| Planning effort      | Compare time and correction effort with the baseline            | A meaningful reduction without lower decision quality                        |
| Reasoning quality    | Review objective links, tradeoffs, and response to disagreement | Company context contributes relevant, defensible reasoning                   |
| Continued usefulness | Observe accepted plans, updates, and voluntary reuse            | The plan supports actual work beyond the first session                       |
| Operating effort     | Record latency, model cost, and context upkeep                  | Acceptable to the user within limits agreed before expansion                 |

Numerical improvement targets should be agreed after measuring the baseline. Acceptance rate alone is insufficient because agreeable but unsupported advice can be accepted.

### Essential validation cases

- A task without an objective is retained as an obligation or flagged for clarification.
- A newly supplied deadline changes the explanation and proposed order visibly.
- A user override is respected without silently changing company objectives.
- Stale or conflicting context is surfaced rather than presented as settled fact.
- Reprioritization preserves completed tasks, active work, and task identifiers.
- Restricted records cannot be retrieved, cited, or exposed in an explanation.
- Repeating the same request produces broadly defensible priorities; material variation can be investigated.
- A model or retrieval failure leaves the input and accepted plan intact.

## 12 Risks and responses

| Risk                                               | Proposed response                                                                   |
| -------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Outdated or ambiguous objectives drive poor advice | Assign owners, review dates, versions, and an explicit conflict-resolution process  |
| The assistant agrees with every proposed change    | Evaluate whether feedback addresses evidence and tradeoffs; retain user control     |
| Urgent small tasks crowd out important work        | Review the priority principles and protect agreed work already underway             |
| The system invents impact, effort, or deadlines    | Preserve provenance, label estimates, and ask when uncertainty changes the decision |
| Reprioritization causes constant switching         | Require acceptance of meaningful changes and explain the cost of interruption       |
| Sensitive context appears in a recommendation      | Minimize the collection and enforce access before retrieval and generation          |
| Knowledge upkeep costs more than it saves          | Begin with a small collection and measure maintenance alongside planning benefit    |
| A broad roadmap obscures the personal use case     | Keep company-wide delegation and optimization outside the initial scope             |

## 13 Decisions to resolve during discovery

1. What real backlog will anchor the pilot, and how does the user prioritize it today?
2. Which company objectives and challenges are current, and who can validate their relative importance?
3. Is the primary planning horizon today, this week, or a flexible period selected by the user?
4. Which commitments override ordinary priority comparisons, and how are conflicts resolved?
5. Who will maintain the knowledge collection, and what triggers a review?
6. Which personal preferences should persist between plans, and how can the user inspect or remove them?
7. Should the initial interface be in Spanish, English, or support both?
8. Which model provider and data handling arrangements fit DNAture’s requirements?
9. What improvement, latency, cost, and maintenance limits would justify continued investment?

## 14 Recommended next steps

First, the technology lead should supply a real backlog and describe recent difficult priority decisions. Administration should then help validate a concise set of objectives, active challenges, and priority principles. Named responsibilities and availability need confirmation before scheduling this work.

Next, prepare a versioned pilot context collection and run the comparison experiment before building broad ingestion or project management features. Use the results to decide whether to proceed with the personal planning interface, improve the knowledge collection, or retain a simpler manual or conversational approach.

Proceed to a product requirements document and technical design when the context is usable, the comparison demonstrates a practical benefit, and the minimum workflow is clear. Expand to other administrators or supervisors only after their needs and access boundaries have been studied separately.

The immediate discovery deliverables are a reviewed context collection, a representative backlog set, documented priority principles, an evaluated interaction prototype, and a decision on whether the personal pilot merits implementation.
