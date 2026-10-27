import {QueryDocumentSnapshot} from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import { Users, Mail, BarChart3, MessageSquare, History, ExternalLink } from 'lucide-react';
import { getAdminUsers, getAccessInvites, getAdminFamilies, getAdminChallenges, getAdminAudit, sendAccessInvite, revokeAccessInvite, approveWaitlistUsers, updateAdminFeedback, AccessInvite, AdminFamily, AdminChallenge, AuditEvent } from '../../services/adminService';
import { getAllFeedback } from '../../services/feedbackService';
import { User, Feedback } from '../../types';
import { getInviteProgress, challengeHasCompletion, lastRecordedActivity } from '../../lib/adminInsights.mjs';
import {reconcileFamilyAchievements, AchievementReconciliation} from '../../services/adminService';

const panel = 'rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6';
const input = 'rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white';
const button = 'rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50';
const secondary = 'rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50';
const date = (value?: Date) => value ? value.toLocaleDateString() : 'Unknown';
type Action = (label: string, operation: () => Promise<string | void>) => Promise<void>;
type CommonProps = { disabled: boolean; loading: boolean; runAction: Action };

export default function AdminDashboard() {
    const [users, setUsers] = useState<User[]>([]);
    const [invites, setInvites] = useState<AccessInvite[]>([]);
    const [families, setFamilies] = useState<AdminFamily[]>([]);
    const [challenges, setChallenges] = useState<AdminChallenge[]>([]);
    const [feedback, setFeedback] = useState<Feedback[]>([]);
    const [audit, setAudit] = useState<AuditEvent[]>([]);
    const [section, setSection] = useState('waitlist');
    const [loading, setLoading] = useState(true);
    const [unavailable, setUnavailable] = useState<string[]>([]);
    const [busy, setBusy] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const generation = useRef(0);
    const [pages, setPages] = useState<{cursor?: QueryDocumentSnapshot; hasMore: boolean}[]>([]);
    const labels = ['accounts', 'invitations', 'families', 'challenges', 'feedback', 'activity log'];
    const loaders = [getAdminUsers, getAccessInvites, getAdminFamilies, getAdminChallenges, getAllFeedback, getAdminAudit];
    const fetchData = async () => {
        const request = ++generation.current;
        setLoading(true);
        const results = await Promise.allSettled([getAdminUsers(), getAccessInvites(), getAdminFamilies(), getAdminChallenges(), getAllFeedback(), getAdminAudit()]);
        if (request !== generation.current) return;
        setPages(results.map(result => result.status === 'fulfilled' ? {cursor: result.value.cursor, hasMore: result.value.hasMore} : {hasMore: false}));
        if (results[0].status === 'fulfilled') setUsers(results[0].value.items);
        if (results[1].status === 'fulfilled') setInvites(results[1].value.items);
        if (results[2].status === 'fulfilled') setFamilies(results[2].value.items);
        if (results[3].status === 'fulfilled') setChallenges(results[3].value.items);
        if (results[4].status === 'fulfilled') setFeedback(results[4].value.items);
        if (results[5].status === 'fulfilled') setAudit(results[5].value.items);
        setUnavailable(results.flatMap((result, index) => result.status === 'rejected' ? [['accounts', 'invitations', 'families', 'challenges', 'feedback', 'activity log'][index]] : []));
        setLoading(false);
    };
    useEffect(() => { void fetchData(); return () => { generation.current++; }; }, []);
    const loadMore = async (index: number) => {
        if (loading || busy || !pages[index]?.hasMore) return;
        setLoading(true); setError('');
        const request = generation.current;
        try {
            const result = await loaders[index](pages[index].cursor);
            if (request !== generation.current) return;
            const merge = <T extends {id: string}>(previous: T[], next: T[]) => [...new Map([...previous, ...next].map(item => [item.id, item])).values()];
            switch (index) {
                case 0: setUsers(old => merge(old, result.items as User[])); break;
                case 1: setInvites(old => merge(old, result.items as AccessInvite[])); break;
                case 2: setFamilies(old => merge(old, result.items as AdminFamily[])); break;
                case 3: setChallenges(old => merge(old, result.items as AdminChallenge[])); break;
                case 4: setFeedback(old => merge(old, result.items as Feedback[])); break;
                case 5: setAudit(old => merge(old, result.items as AuditEvent[])); break;
            }
            setPages(old => old.map((page, i) => i === index ? {cursor: result.cursor, hasMore: result.hasMore} : page));
        } catch { if (request === generation.current) setError('Could not load more records. Your current list is retained. Try again.'); }
        finally { if (request === generation.current) setLoading(false); }
    };
    const runAction: Action = async (label, operation) => {
        setBusy(label); setMessage(''); setError('');
        try { setMessage((await operation()) || `${label} completed.`); }
        catch (error) { setError(error instanceof Error ? error.message : 'Could not complete this action. Please retry.'); }
        finally { await fetchData(); setBusy(''); }
    };
    const disabled = loading || !!busy;
    const pending = users.filter(user => user.status === 'pending_approval');
    const common = { disabled, loading, runAction };
    const sections = [
        { id: 'waitlist', label: `Waitlist (${pending.length})`, icon: Users }, { id: 'invites', label: 'Invite codes', icon: Mail },
        { id: 'metrics', label: 'Metrics & funnel', icon: BarChart3 }, { id: 'families', label: 'Families', icon: Users },
        { id: 'feedback', label: 'Feedback', icon: MessageSquare }, { id: 'activity', label: 'Activity log', icon: History },
        { id: 'achievements', label: 'Achievement backfill', icon: History },
    ];
    return <main className="min-h-screen bg-slate-950 p-4 text-white sm:p-8"><div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-3xl font-bold">Admin Dashboard</h1><p className="mt-2 text-slate-400">Help families get started and keep your community moving.</p></div><button onClick={() => void fetchData()} disabled={disabled} className={secondary}>{loading ? 'Refreshing…' : 'Refresh data'}</button></header>
        <nav aria-label="Admin sections" className="mb-6 flex flex-wrap gap-2">{sections.map(item => <button key={item.id} onClick={() => setSection(item.id)} aria-pressed={section === item.id} className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium ${section === item.id ? 'bg-indigo-600' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'}`}><item.icon size={18} aria-hidden="true" />{item.label}</button>)}</nav>
        {pages.some(page => page.hasMore) && <section aria-label="More admin records" className="mb-4 rounded-xl border border-slate-700 p-4"><p className="mb-3 text-sm text-amber-200">Lists, searches, and summaries cover loaded records only. Load more records for complete results.</p><div className="flex flex-wrap gap-2">{pages.map((page, index) => page.hasMore && <button key={labels[index]} className={secondary} disabled={disabled} onClick={() => void loadMore(index)}>Load 50 more {labels[index]}</button>)}</div></section>}
        {unavailable.length > 0 && <p role="alert" className="mb-4 rounded-xl bg-amber-500/10 p-4 text-sm text-amber-200">Could not refresh {unavailable.join(', ')}. Some data is incomplete or outdated. Refresh to retry.</p>}
        {error && <p role="alert" className="mb-4 rounded-xl bg-red-500/10 p-4 text-sm text-red-300">{error}</p>}
        {(message || busy) && <p role="status" className="mb-4 rounded-xl bg-emerald-500/10 p-4 text-sm text-emerald-300">{busy ? `${busy}…` : message}</p>}
        {section === 'waitlist' && <WaitlistPanel {...common} disabled={disabled || unavailable.includes('accounts')} users={pending} />}
        {section === 'achievements' && <AchievementBackfillPanel {...common} families={families}/>}
        {section === 'invites' && <InvitesPanel {...common} disabled={disabled || unavailable.includes('invitations')} invites={invites} users={users} families={families} challenges={challenges} progressAvailable={!pages.slice(0,4).some(page => page.hasMore) && !unavailable.some(name => ['accounts', 'families', 'challenges'].includes(name))} />}
        {section === 'metrics' && <MetricsPanel users={users} families={families} challenges={challenges} invites={invites} loading={loading} unavailable={unavailable} />}
        {section === 'families' && <FamiliesPanel families={families} users={users} challenges={challenges} loading={loading} unavailable={unavailable} />}
        {section === 'feedback' && <FeedbackPanel {...common} disabled={disabled || unavailable.includes('feedback')} feedback={feedback} />}
        {section === 'activity' && <ActivityPanel events={audit} users={users} loading={loading} />}
    </div></main>;
}

function WaitlistPanel({ users, disabled, loading, runAction }: CommonProps & { users: User[] }) {
    const [search, setSearch] = useState(''); const [role, setRole] = useState('all'); const [sort, setSort] = useState('oldest');
    const [selected, setSelected] = useState<string[]>([]);
    const visible = users.filter(user => (role === 'all' || user.role === role) && `${user.name} ${user.email || ''}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => {
        if (sort === 'name') return a.name.localeCompare(b.name);
        if (!a.createdAt) return b.createdAt ? 1 : a.name.localeCompare(b.name);
        if (!b.createdAt) return -1;
        return (a.createdAt.getTime() - b.createdAt.getTime()) * (sort === 'newest' ? -1 : 1);
    });
    const selectedPending = selected.filter(id => users.some(user => user.id === id));
    const approve = (ids: string[]) => runAction('Approving accounts', async () => {
        const result = await approveWaitlistUsers(ids);
        setSelected(previous => previous.filter(id => !result.approved.includes(id) && !result.skipped.includes(id)));
        return `Approved ${result.approved.length} account(s).${result.skipped.length ? ` Skipped ${result.skipped.length} account(s) no longer awaiting approval.` : ''}`;
    });
    return <section className={panel}><h2 className="text-xl font-semibold">Waitlist approvals</h2><p className="mt-2 text-sm text-slate-400">Approve up to 50 accounts at a time. Older records without a signup date appear last.</p>
        <div className="my-5 flex flex-wrap gap-3"><input aria-label="Search waitlist by name or email" placeholder="Search name or email" value={search} onChange={event => setSearch(event.target.value)} className={`${input} flex-1`} /><select aria-label="Filter waitlist by role" value={role} onChange={event => setRole(event.target.value)} className={input}><option value="all">All roles</option><option value="adult">Parents / adults</option><option value="teen">Teens</option><option value="child">Children</option></select><select aria-label="Sort waitlist" value={sort} onChange={event => setSort(event.target.value)} className={input}><option value="oldest">Oldest first</option><option value="newest">Newest first</option><option value="name">Name A–Z</option></select></div>
        <div className="mb-4 flex flex-wrap items-center gap-3 text-sm"><button className={secondary} disabled={disabled || !visible.length} onClick={() => setSelected(visible.slice(0, 50).map(user => user.id))}>Select visible (up to 50)</button><button className={secondary} disabled={disabled || !selectedPending.length} onClick={() => setSelected([])}>Clear selection</button><button className={button} disabled={disabled || !selectedPending.length} onClick={() => void approve(selectedPending)}>Approve selected ({selectedPending.length})</button><span className="text-slate-400">{visible.length} matching requests</span></div>
        {loading ? <Empty>Loading requests…</Empty> : !visible.length ? <Empty>{users.length ? 'No requests match your filters.' : 'No pending requests.'}</Empty> : <div className="divide-y divide-slate-800">{visible.map(user => <div key={user.id} className="flex flex-wrap items-center justify-between gap-4 py-4"><div className="flex min-w-0 items-start gap-3"><input type="checkbox" aria-label={`Select ${user.name || user.email}`} checked={selectedPending.includes(user.id)} disabled={disabled || (!selectedPending.includes(user.id) && selectedPending.length >= 50)} onChange={event => setSelected(previous => event.target.checked ? [...previous, user.id] : previous.filter(id => id !== user.id))} className="mt-1 h-4 w-4 accent-indigo-500" /><div className="min-w-0"><p className="font-medium">{user.name}</p><p className="break-all text-sm text-slate-400">{user.email || 'No email'} · {user.role || 'Unspecified role'}</p><p className="mt-1 text-xs text-slate-500">Requested: {date(user.createdAt)}{user.earlyAccessData?.kidCount !== undefined ? ` · Kids: ${user.earlyAccessData.kidCount}` : ''}{user.earlyAccessData?.kidAges ? ` · Ages: ${user.earlyAccessData.kidAges}` : ''}</p></div></div><button disabled={disabled} onClick={() => void approve([user.id])} className={`${secondary} text-emerald-300`}>Approve access</button></div>)}</div>}
    </section>;
}

function InvitesPanel({ invites, users, families, challenges, disabled, loading, progressAvailable, runAction }: CommonProps & { invites: AccessInvite[]; users: User[]; families: AdminFamily[]; challenges: AdminChallenge[]; progressAvailable: boolean }) {
    const [email, setEmail] = useState(''); const [search, setSearch] = useState('');
    const visible = invites.filter(invite => invite.email.toLowerCase().includes(search.toLowerCase()));
    const send = (recipient: string, resend = false) => runAction(resend ? 'Resending invitation' : 'Sending invitation', async () => {
        await sendAccessInvite(recipient.trim(), resend); setEmail(''); return `Invitation sent to the email provider for ${recipient.trim()}.`;
    });
    return <section className={panel}><h2 className="text-xl font-semibold">Invite the first family member</h2><p className="mt-2 text-sm text-slate-400">The app admin’s invite pre-approves the first parent. Signup takes them directly to creating an approved family circle. Codes are tied to the recipient’s email and expire after 14 days.</p>
        <form className="my-6 flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={event => { event.preventDefault(); void send(email); }}><div className="flex-1"><label htmlFor="admin-invite-email" className="mb-2 block text-sm">Recipient email</label><input id="admin-invite-email" type="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} disabled={disabled} placeholder="parent@example.com" className={`${input} w-full`} /></div><button disabled={disabled} className={button}>Send invite code</button></form>
        <h3 className="mb-3 font-medium">Invitation history</h3><input aria-label="Search invitations by recipient email" placeholder="Search recipient email" value={search} onChange={event => setSearch(event.target.value)} className={`${input} mb-4 w-full sm:max-w-sm`} /><p className="mb-4 text-xs text-slate-500">Resend sends a fresh email with the same code. Retrying a failed send reuses its delivery attempt. Revoking an unused invite immediately prevents redemption.</p>
        {loading ? <Empty>Loading invitations…</Empty> : !visible.length ? <Empty>No invitations match.</Empty> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-slate-400"><tr>{['Recipient', 'Invitation', 'Onboarding', 'Expires', 'Actions'].map(label => <th key={label} className="p-3">{label}</th>)}</tr></thead><tbody>{visible.map(invite => {
            const expired = invite.expiresAt.getTime() <= Date.now(); const progress = getInviteProgress(invite, users, families, challenges);
            const status = invite.status === 'claimed' ? 'Redeemed' : invite.status === 'revoked' ? 'Revoked' : expired ? 'Expired' : invite.status === 'sent' ? 'Sent to provider' : invite.status === 'failed' ? 'Delivery failed' : 'Pending send';
            const milestone = !progressAvailable ? 'Unavailable' : progress.challengeCompleted ? 'First challenge completed' : progress.memberAdded ? 'Family member added' : progress.circleCreated ? 'Circle created' : progress.signedUp ? 'Account created' : 'Not signed up';
            return <tr key={invite.id} className="border-t border-slate-800"><td className="p-3">{invite.email}</td><td className="p-3">{status}</td><td className="p-3">{milestone}</td><td className="p-3 whitespace-nowrap">{date(invite.expiresAt)}</td><td className="p-3"><div className="flex gap-2">{invite.status !== 'claimed' && <button className={secondary} disabled={disabled} onClick={() => void send(invite.email, true)}>{expired || invite.status === 'revoked' ? 'Send new code' : invite.status === 'failed' || invite.status === 'pending' ? 'Retry send' : 'Resend'}</button>}{invite.status !== 'claimed' && invite.status !== 'revoked' && !expired && <button className={`${secondary} text-red-300`} disabled={disabled} onClick={() => void runAction('Revoking invitation', async () => { await revokeAccessInvite(invite.id); return `Revoked the unused invitation for ${invite.email}.`; })}>Revoke</button>}</div></td></tr>;
        })}</tbody></table></div>}
    </section>;
}

function MetricsPanel({ users, families, challenges, invites, loading, unavailable }: { users: User[]; families: AdminFamily[]; challenges: AdminChallenge[]; invites: AccessInvite[]; loading: boolean; unavailable: string[] }) {
    const active = (days: number) => users.filter(user => (lastRecordedActivity(user)?.getTime() || 0) >= Date.now() - days * 86400000).length;
    const accountCount = (value: number) => unavailable.includes('accounts') ? 'Unavailable' : value;
    const metrics = [['Total accounts', accountCount(users.length)], ['Approved accounts', accountCount(users.filter(user => user.status === 'active').length)], ['Awaiting approval', accountCount(users.filter(user => user.status === 'pending_approval').length)], ['Suspended accounts', accountCount(users.filter(user => user.status === 'suspended').length)], ['Active in 7 days', accountCount(active(7))], ['Active in 30 days', accountCount(active(30))], ['Family circles', unavailable.includes('families') ? 'Unavailable' : families.length], ['Invites redeemed', unavailable.includes('invitations') ? 'Unavailable' : invites.filter(invite => invite.status === 'claimed').length]];
    const progress = invites.map(invite => getInviteProgress(invite, users, families, challenges));
    const funnel = [['Invited recipients', invites.length], ['Account created', progress.filter(item => item.signedUp).length], ['Circle created', progress.filter(item => item.circleCreated).length], ['Family member added', progress.filter(item => item.memberAdded).length], ['First challenge completed', progress.filter(item => item.challengeCompleted).length]];
    const available = !unavailable.some(name => ['accounts', 'invitations', 'families', 'challenges'].includes(name));
    return <div className="space-y-6"><section className={panel}><h2 className="text-xl font-semibold">User metrics</h2><p className="mb-6 mt-2 text-sm text-slate-400">Activity uses recorded last-active dates and daily activity entries, including signup. These are not live session counts.</p><div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{metrics.map(([label, value]) => <Stat key={label} label={String(label)} value={loading ? '…' : value} />)}</div><h3 className="mb-3 mt-6 font-medium">Accounts by role</h3><div className="flex flex-wrap gap-3 text-sm text-slate-300">{['adult', 'teen', 'child', 'unspecified'].map(role => <p key={role} className="rounded-lg bg-slate-800 px-4 py-3">{role === 'adult' ? 'Parents / adults' : role === 'unspecified' ? 'Unspecified' : `${role}s`}: {loading ? '…' : accountCount(users.filter(user => role === 'unspecified' ? !user.role : user.role === role).length)}</p>)}</div></section>
        <section className={panel}><h2 className="text-xl font-semibold">Family onboarding funnel</h2><p className="mb-6 mt-2 text-sm text-slate-400">Current state of admin-invited recipients, counted once per email. Later stages require redemption and a circle created by the recipient. Completion means an individual challenge has a completion or a team challenge reached its goal.</p><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{funnel.map(([label, value]) => {
            const percentage = invites.length ? Math.round(Number(value) / invites.length * 100) : 0;
            return <div key={label} className="rounded-xl border border-slate-800 bg-slate-950 p-4"><Stat label={String(label)} value={loading ? '…' : !available ? 'Unavailable' : value} bare />{!loading && available && <><div className="my-3 h-2 overflow-hidden rounded-full bg-slate-800" aria-hidden="true"><div className="h-full rounded-full bg-indigo-400" style={{ width: `${percentage}%` }} /></div><p className="text-xs text-slate-400">{percentage}% of invited recipients</p></>}</div>;
        })}</div><p className="mt-4 text-xs text-slate-500">Counts use retained records, not historical conversion events. Deleted challenges or removed members can change counts. Revoked and expired invites remain in the recipient total.</p></section>
    </div>;
}

function FamiliesPanel({ families, users, challenges, loading, unavailable }: { families: AdminFamily[]; users: User[]; challenges: AdminChallenge[]; loading: boolean; unavailable: string[] }) {
    const [search, setSearch] = useState(''); const [filter, setFilter] = useState('all'); const [expanded, setExpanded] = useState<string | null>(null);
    const activityAvailable = !unavailable.some(name => ['accounts', 'challenges'].includes(name));
    const rows = families.map(family => {
        const members = users.filter(user => family.memberIds.includes(user.id));
        const activityDates = members.map(lastRecordedActivity).filter(Boolean).map(value => value.getTime());
        const familyChallenges = challenges.filter(challenge => challenge.familyCircleId === family.id);
        const challengeDates = familyChallenges.map(challenge => challenge.timestamp?.getTime() || 0).filter(value => value <= Date.now());
        return { family, members, familyChallenges, lastActive: Math.max(0, ...activityDates, ...challengeDates) };
    }).filter(row => `${row.family.name} ${row.family.id} ${row.members.map(user => `${user.name} ${user.email || ''}`).join(' ')}`.toLowerCase().includes(search.toLowerCase()) && (filter === 'all' || (filter === 'solo' ? row.family.memberIds.length <= 1 : !activityAvailable || row.lastActive >= Date.now() - 7 * 86400000))).sort((a, b) => b.lastActive - a.lastActive);
    return <section className={panel}><h2 className="text-xl font-semibold">Family overview</h2><p className="mt-2 text-sm text-slate-400">Search by family name, ID, or member. Recent activity uses member activity and challenge creation.</p><div className="my-5 flex flex-wrap gap-3"><input aria-label="Search families" placeholder="Search family or member" value={search} onChange={event => setSearch(event.target.value)} className={`${input} flex-1`} /><select aria-label="Filter families" value={filter} onChange={event => setFilter(event.target.value)} className={input}><option value="all">All families</option><option value="solo">Only the first member</option><option value="active" disabled={!activityAvailable}>Active in 7 days</option></select></div>
        {loading ? <Empty>Loading families…</Empty> : !rows.length ? <Empty>No families match your filters.</Empty> : <div className="space-y-3">{rows.map(({ family, members, familyChallenges, lastActive }) => <article key={family.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{family.name}</h3><p className="mt-1 break-all text-xs text-slate-500">{family.id}</p></div><button className={secondary} aria-expanded={expanded === family.id} onClick={() => setExpanded(expanded === family.id ? null : family.id)}>{expanded === family.id ? 'Hide members' : 'View members'}</button></div><div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-300"><span>{family.memberIds.length} members</span><span>{unavailable.includes('challenges') ? 'Challenges unavailable' : `${familyChallenges.length} challenges · ${familyChallenges.filter(challengeHasCompletion).length} completed`}</span><span>Last recorded activity: {activityAvailable ? date(lastActive ? new Date(lastActive) : undefined) : 'Unavailable'}</span><span>{family.betaApproved ? 'Circle approved' : 'Circle approval flag not set'}</span></div>{expanded === family.id && <div className="mt-4 space-y-2 border-t border-slate-800 pt-4">{unavailable.includes('accounts') ? <p className="text-sm text-slate-400">Member data is unavailable.</p> : <>{members.map(member => <div key={member.id} className="flex flex-wrap justify-between gap-2 text-sm"><div><p>{member.name}{family.adminIds.includes(member.id) && <span className="text-xs text-indigo-300"> · Family admin</span>}</p><p className="break-all text-xs text-slate-500">{member.email || member.id}</p></div><p className="text-slate-400">{member.role || 'Unspecified'} · {member.status || 'Unknown status'}</p></div>)}{members.length < family.memberIds.length && <p className="text-xs text-amber-300">{family.memberIds.length - members.length} member record(s) could not be found.</p>}</>}</div>}</article>)}</div>}
    </section>;
}

function FeedbackPanel({ feedback, loading, disabled, runAction }: CommonProps & { feedback: Feedback[] }) {
    const [filter, setFilter] = useState('all'); const [search, setSearch] = useState('');
    const visible = feedback.filter(item => (filter === 'all' || (item.status || 'new') === filter) && `${item.issue} ${item.userName || ''} ${item.userEmail || ''}`.toLowerCase().includes(search.toLowerCase()));
    return <section className={panel}><h2 className="text-xl font-semibold">Feedback tracking</h2><p className="mt-2 text-sm text-slate-400">Track investigation and resolution. Internal notes are visible only to app admins.</p><div className="my-5 flex flex-wrap gap-3"><input aria-label="Search feedback" placeholder="Search issue or user" value={search} onChange={event => setSearch(event.target.value)} className={`${input} flex-1`} /><select aria-label="Filter feedback by status" value={filter} onChange={event => setFilter(event.target.value)} className={input}><option value="all">All statuses</option><option value="new">New</option><option value="investigating">Investigating</option><option value="resolved">Resolved</option></select></div>{loading && !feedback.length ? <Empty>Loading feedback…</Empty> : !visible.length ? <Empty>No feedback matches your filters.</Empty> : <div className="space-y-4">{visible.map(item => <FeedbackCard key={item.id} item={item} disabled={disabled} runAction={runAction} />)}</div>}</section>;
}
function FeedbackCard({ item, disabled, runAction }: { item: Feedback; disabled: boolean; runAction: Action }) {
    const [status, setStatus] = useState(item.status || 'new'); const [notes, setNotes] = useState(item.internalNotes || '');
    return <article className="rounded-xl border border-slate-800 bg-slate-950 p-4"><div className="flex flex-wrap justify-between gap-3"><div><h3 className="font-medium">{item.userName || 'Unknown user'}</h3><p className="break-all text-xs text-slate-500">{item.userEmail || item.userId} · {item.role} · {date(item.timestamp)}</p></div>{item.rating && <p className="text-sm text-yellow-400">{item.rating}/5</p>}</div><p className="mt-4 whitespace-pre-wrap text-sm text-slate-200">{item.issue}</p>{item.whatWorked && <p className="mt-2 whitespace-pre-wrap text-sm text-emerald-300">{item.whatWorked}</p>}<div className="my-3 flex flex-wrap gap-4 text-xs text-slate-500"><span>Context: {item.context}</span>{item.screenshotUrl && <a href={item.screenshotUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-indigo-300"><ExternalLink size={12} />View screenshot</a>}</div><form className="space-y-3 border-t border-slate-800 pt-4" onSubmit={event => { event.preventDefault(); void runAction('Saving feedback review', async () => { await updateAdminFeedback(item.id, status, notes); return 'Feedback status and internal notes saved.'; }); }}><div><label htmlFor={`feedback-status-${item.id}`} className="mb-1 block text-xs text-slate-400">Status</label><select id={`feedback-status-${item.id}`} value={status} onChange={event => setStatus(event.target.value as NonNullable<Feedback['status']>)} disabled={disabled} className={input}><option value="new">New</option><option value="investigating">Investigating</option><option value="resolved">Resolved</option></select></div><div><label htmlFor={`feedback-notes-${item.id}`} className="mb-1 block text-xs text-slate-400">Internal notes</label><textarea id={`feedback-notes-${item.id}`} value={notes} onChange={event => setNotes(event.target.value)} maxLength={5000} rows={3} disabled={disabled} className={`${input} w-full`} placeholder="Investigation details, next steps, or resolution…" /></div><button disabled={disabled} className={button}>Save review</button></form></article>;
}

function ActivityPanel({ events, users, loading }: { events: AuditEvent[]; users: User[]; loading: boolean }) {
    const [filter, setFilter] = useState('all'); const [search, setSearch] = useState('');
    const userLabel = (id: string) => users.find(user => user.id === id)?.email || users.find(user => user.id === id)?.name || id;
    const visible = events.filter(event => (filter === 'all' || event.action.startsWith(filter)) && `${event.action} ${userLabel(event.actorId)} ${event.details?.email || userLabel(event.targetId)}`.toLowerCase().includes(search.toLowerCase()));
    return <section className={panel}><h2 className="text-xl font-semibold">Admin activity log</h2><p className="mt-2 text-sm text-slate-400">Latest 200 server-recorded events. Logging begins with this release; earlier actions are not backfilled.</p><div className="my-5 flex flex-wrap gap-3"><input aria-label="Search activity log" placeholder="Search admin, recipient, or action" value={search} onChange={event => setSearch(event.target.value)} className={`${input} flex-1`} /><select aria-label="Filter activity type" value={filter} onChange={event => setFilter(event.target.value)} className={input}><option value="all">All actions</option><option value="invite_">Invitations</option><option value="account_">Account approvals</option><option value="feedback_">Feedback reviews</option></select></div>{loading ? <Empty>Loading activity…</Empty> : !visible.length ? <Empty>No activity matches your filters.</Empty> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-slate-400"><tr>{['When', 'Actor', 'Action', 'Target'].map(label => <th key={label} className="p-3">{label}</th>)}</tr></thead><tbody>{visible.map(event => <tr key={event.id} className="border-t border-slate-800"><td className="p-3 whitespace-nowrap">{event.timestamp?.toLocaleString() || 'Unknown'}</td><td className="p-3">{userLabel(event.actorId)}</td><td className="p-3 capitalize">{event.action.replaceAll('_', ' ')}{event.details?.status ? ` · ${event.details.status}` : ''}</td><td className="p-3 break-all">{event.details?.email || userLabel(event.targetId)}</td></tr>)}</tbody></table></div>}</section>;
}
function Stat({ label, value, bare = false }: { label: string; value: string | number; bare?: boolean }) {
    return <div className={bare ? '' : 'rounded-xl border border-slate-800 bg-slate-950 p-4'}><p className="text-sm text-slate-400">{label}</p><p className={`mt-2 font-semibold ${typeof value === 'number' ? 'text-3xl' : 'text-lg'}`}>{value}</p></div>;
}
function Empty({ children }: { children: React.ReactNode }) { return <p className="py-8 text-center text-sm text-slate-400">{children}</p>; }

function AchievementBackfillPanel({families, disabled, runAction}: CommonProps & {families: AdminFamily[]}) {
    const [circleId, setCircleId] = useState('');
    const [preview, setPreview] = useState<AchievementReconciliation>();
    return <section className={panel}><h2 className="text-xl font-semibold">Reconcile achievement history</h2><p className="mt-2 text-sm text-slate-400">Preview one family first. Applying the backfill keeps existing awards and pins, adds reliable historical credit, and sends no celebrations or chat announcements.</p>
        <label htmlFor="achievement-backfill-family" className="block mt-4 mb-2 text-sm">Family Circle</label><select id="achievement-backfill-family" className={input} value={circleId} disabled={disabled} onChange={e => {setCircleId(e.target.value); setPreview(undefined);}}><option value="">Choose a family</option>{families.map(family => <option key={family.id} value={family.id}>{family.name || family.id}</option>)}</select>
        <div className="flex gap-3 my-4"><button className={secondary} disabled={disabled || !circleId} onClick={() => runAction('Preview backfill', async () => {const result = await reconcileFamilyAchievements(circleId); setPreview(result); return `Preview: ${result.newAwards} new personal awards across ${result.members} members.`;})}>Preview backfill</button><button className={button} disabled={disabled || !preview || !circleId} onClick={() => runAction('Apply backfill', async () => {const result = await reconcileFamilyAchievements(circleId, true); setPreview(undefined); return `Backfill applied: ${result.newAwards} personal awards. No announcements sent.`;})}>Apply quiet backfill</button></div>
        {preview && <p className="text-sm text-slate-400">{preview.skippedCompletionDates} legacy completions lack a reliable completion date. They count toward milestones and Explorer, but cannot establish activity weeks or return gaps.</p>}
    </section>;
}
