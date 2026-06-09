export interface ParticipantBalance {
  user_id: string;
  name: string;
  email: string;
  avatar_url: string;
  total_paid: number;
  total_share: number;
  net_balance: number; // positive means owed money, negative means owes money
}

export interface SimplifiedDebt {
  from_user_id: string;
  from_name: string;
  from_avatar: string;
  to_user_id: string;
  to_name: string;
  to_avatar: string;
  amount: number;
}

/**
 * Calculates net balances for all group members and runs debt simplification
 */
export function calculateBalancesAndDebts(
  groupMembers: any[],
  expenses: any[],
  expenseSplits: any[],
  settlements: any[]
): { balances: ParticipantBalance[]; simplifiedDebts: SimplifiedDebt[] } {
  const memberMap = new Map<string, any>();
  const balances: { [user_id: string]: ParticipantBalance } = {};

  // Initialize balance for each group member
  groupMembers.forEach((member: any) => {
    const user = member.user || member;
    const u_id = user.id || user.user_id;
    memberMap.set(u_id, {
      id: u_id,
      name: user.name,
      email: user.email,
      avatar_url: user.avatar_url,
    });

    balances[u_id] = {
      user_id: u_id,
      name: user.name,
      email: user.email,
      avatar_url: user.avatar_url,
      total_paid: 0,
      total_share: 0,
      net_balance: 0,
    };
  });

  // 1. Process all expenses
  expenses.forEach((expense: any) => {
    const payerId = expense.paid_by_user_id;

    // Track original payment credit
    if (balances[payerId]) {
      balances[payerId].total_paid += Number(expense.amount);
    }

    // Process splits for this expense
    const splits = expenseSplits.filter((s: any) => s.expense_id === expense.id);
    splits.forEach((split: any) => {
      const splitUserId = split.user_id;
      if (balances[splitUserId]) {
        balances[splitUserId].total_share += Number(split.amount);
      }
    });
  });

  // 2. Process settlements (settlements are direct transfers to reduce debt)
  settlements.forEach((settlement: any) => {
    const fromId = settlement.from_user_id;
    const toId = settlement.to_user_id;
    const amount = Number(settlement.amount);

    if (balances[fromId]) {
      // Paying reductions: acts as if the debtor paid more (increasing total_paid)
      balances[fromId].total_paid += amount;
    }
    if (balances[toId]) {
      // Receiving reductions: acts as if the creditor's share increased or paid credit is reduced
      // Specifically: reduces balance they are owed, we reduce their total_paid or increase their total_share
      balances[toId].total_share += amount;
    }
  });

  // Calculate final net balances
  const balancesList = Object.values(balances);
  balancesList.forEach((bal) => {
    // Net balance = paid - share
    // If Alex paid 1200 and shared 400, his net balance is +800 (overall owed €800)
    // If Rahul paid 0 and shared 400, his net balance is -400 (overall owes €400)
    bal.net_balance = Number((bal.total_paid - bal.total_share).toFixed(2));
  });

  // 3. Debt Simplification Algorithm (Greedy Debt Minimization)
  const simplifiedDebts: SimplifiedDebt[] = [];

  // Split into debtors (negative balance) and creditors (positive balance)
  const debtors: { id: string; name: string; avatar: string; amount: number }[] = [];
  const creditors: { id: string; name: string; avatar: string; amount: number }[] = [];

  balancesList.forEach((b) => {
    const member = memberMap.get(b.user_id);
    const name = member?.name || b.name;
    const avatar = member?.avatar_url || b.avatar_url;

    if (b.net_balance < -0.01) {
      debtors.push({
        id: b.user_id,
        name,
        avatar,
        amount: Math.abs(b.net_balance),
      });
    } else if (b.net_balance > 0.01) {
      creditors.push({
        id: b.user_id,
        name,
        avatar,
        amount: b.net_balance,
      });
    }
  });

  // Sort descending by amount
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    const amountToTransfer = Number(Math.min(debtor.amount, creditor.amount).toFixed(2));

    if (amountToTransfer > 0) {
      simplifiedDebts.push({
        from_user_id: debtor.id,
        from_name: debtor.name,
        from_avatar: debtor.avatar,
        to_user_id: creditor.id,
        to_name: creditor.name,
        to_avatar: creditor.avatar,
        amount: amountToTransfer,
      });
    }

    debtor.amount = Number((debtor.amount - amountToTransfer).toFixed(2));
    creditor.amount = Number((creditor.amount - amountToTransfer).toFixed(2));

    if (debtor.amount <= 0.01) {
      dIdx++;
    }
    if (creditor.amount <= 0.01) {
      cIdx++;
    }
  }

  return {
    balances: balancesList,
    simplifiedDebts,
  };
}
