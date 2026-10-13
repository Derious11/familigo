const {test} = require('node:test');
const assert = require('node:assert/strict');
const {evaluate, fullHouse, validPins, weekKey, metricAt} = require('../lib/achievements/engine');
const {BADGES, emptyState, activityId} = require('../lib/achievements/catalog');
const day = 86400000;
const monday = Date.parse('2026-09-07T12:00:00Z');
test('catalog has 16 unique stable badges and zero bonus XP', () => {
  assert.equal(BADGES.length, 16); assert.equal(new Set(BADGES.map(b => b.id)).size, 16);
  assert.ok(BADGES.every(b => b.xp === 0));
});
for (const [kind, id] of [['created','game_on'], ['messages','say_hello'], ['comments','first_cheer'], ['contributions','team_player'], ['buddy','challenge_buddy'], ['fullHouse','full_house']]) {
  test(`${kind} awards ${id} once`, () => {
    const first = evaluate(undefined, {kind, at: monday}); assert.deepEqual(first.unlocked, [id]);
    assert.deepEqual(evaluate(first.state, {kind, at: monday}).unlocked, []);
  });
}
test('valid completions earn all milestones and normalized Explorer', () => {
  let state = emptyState();
  for (let i = 1; i <= 25; i++) {
    state = evaluate(state, {kind:'completion',at:monday,category:activityId(['Walk','Push-ups','Run'][i%3])}).state;
    for (const [target,id] of [[1,'first_steps'],[5,'five_alive'],[10,'double_digits'],[25,'challenge_champion']]) assert.equal(!!state.awards[id],i>=target);
  }
  assert.ok(state.awards.explorer); assert.equal(activityId('PUSH UPS'), activityId('Push-ups')); assert.equal(activityId('unknown'), undefined);
});
test('distinct UTC days and Monday weeks respect rest days and year boundaries', () => {
  let state = evaluate(undefined,{kind:'completion',at:monday}).state;
  state = evaluate(state,{kind:'completion',at:monday+100}).state; assert.equal(state.awards.getting_warm,undefined);
  state = evaluate(state,{kind:'completion',at:monday+2*day}).state; assert.ok(state.awards.getting_warm);
  for (let week=1; week<4; week++) for (const offset of [0,2]) state=evaluate(state,{kind:'completion',at:monday+(week*7+offset)*day}).state;
  assert.ok(state.awards.on_a_roll); assert.ok(state.awards.streak_star);
  assert.equal(weekKey(Date.parse('2027-01-03T23:59:59Z')),'2026-12-28');
});
test('a missed week resets current streak but retains permanent awards', () => {
  let state = emptyState(); for (const offset of [0,2,7,9,28,30]) state=evaluate(state,{kind:'completion',at:monday+offset*day}).state;
  assert.equal(state.metrics.activeWeeks,1); assert.ok(state.awards.on_a_roll); assert.equal(state.awards.streak_star,undefined);
});
test('return requires seven complete 24-hour periods', () => {
  const first=evaluate(undefined,{kind:'completion',at:monday}).state;
  assert.equal(evaluate(first,{kind:'completion',at:monday+7*day-1}).state.awards.back_in_action,undefined);
  assert.ok(evaluate(first,{kind:'completion',at:monday+7*day}).state.awards.back_in_action);
});
test('three attributed reactions award High Five', () => {
  let state=emptyState(); for(let i=0;i<3;i++) state=evaluate(state,{kind:'reactions',at:monday}).state;
  assert.ok(state.awards.high_five);
});
test('Full House needs a family snapshot and timely completion by every member', () => {
  assert.equal(fullHouse(['a'],{a:monday},monday),false);
  assert.equal(fullHouse(['a','b'],{a:monday,b:monday+14*day},monday),true);
  assert.equal(fullHouse(['a','b'],{a:monday,b:monday+14*day+1},monday),false);
  assert.equal(fullHouse(['a','b'],{a:monday},monday),false);
  assert.equal(fullHouse(['a','b'],{a:monday-1,b:monday},monday),false);
});
test('pins require ownership, uniqueness, max three, and personal scope', () => {
  let state=emptyState(); for(const kind of ['created','messages','comments','contributions','fullHouse']) state=evaluate(state,{kind,at:monday}).state;
  assert.equal(validPins(['game_on','say_hello','first_cheer'],state),true);
  assert.equal(validPins(['game_on','say_hello','first_cheer','team_player'],state),false);
  assert.equal(validPins(['game_on','game_on'],state),false);
  assert.equal(validPins(['first_steps'],state),false); assert.equal(validPins(['full_house'],state),false);
});
test('historical unknown completion dates credit milestones without inventing weekly activity', () => {
  const {state}=evaluate(undefined,{kind:'legacyCompletion',at:monday,category:'walk'},true);
  assert.equal(state.metrics.completions,1); assert.deepEqual(state.weeks,{});
  assert.ok(state.awards.first_steps.historical);
});
test('next achievement progress expires with the calendar rather than displaying an old streak', () => {
  let state=emptyState(); for(const offset of [0,2,7,9]) state=evaluate(state,{kind:'completion',at:monday+offset*day}).state;
  assert.equal(metricAt(state,'activeWeeks',monday+14*day),2);
  assert.equal(metricAt(state,'activeWeeks',monday+21*day),0);
  assert.equal(metricAt(state,'weekDays',monday+14*day),0);
  assert.equal(metricAt(state,'completions',monday+50*day),4);
});
