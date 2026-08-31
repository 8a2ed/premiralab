import { db, now } from '../db.js';

export function processOrderRewards(orderId: number) {
  try {
    const order = db.prepare('SELECT client_id, payment_amount, points_granted, order_no FROM orders WHERE id = ?').get(orderId) as any;
    if (!order || order.points_granted === 1) return;
    
    const settingsRow = db.prepare("SELECT value FROM settings WHERE key='marketing'").get() as any;
    const mkt = settingsRow && settingsRow.value ? JSON.parse(settingsRow.value) : {};
    
    const pointsPerDollar = Number(mkt.pointsPerDollar) || 0;
    const referralReward = Number(mkt.referralReward) || 0;
    
    const tx = db.transaction(() => {
      db.prepare('UPDATE orders SET points_granted = 1 WHERE id = ?').run(orderId);

      if (pointsPerDollar > 0 && order.payment_amount > 0) {
        const earnedPoints = Math.floor(order.payment_amount * pointsPerDollar);
        db.prepare('UPDATE clients SET points = points + ? WHERE id = ?').run(earnedPoints, order.client_id);
      }
      
      if (referralReward > 0) {
        const paidOrdersCount = db.prepare('SELECT COUNT(*) n FROM orders WHERE client_id = ? AND points_granted = 1').get(order.client_id) as any;
        if (paidOrdersCount.n === 1) {
          const client = db.prepare('SELECT referred_by FROM clients WHERE id = ?').get(order.client_id) as any;
          if (client && client.referred_by) {
             db.prepare('UPDATE clients SET wallet_balance = wallet_balance + ? WHERE id = ?').run(referralReward, client.referred_by);
             db.prepare('INSERT INTO wallet_transactions (client_id, amount, type, description, created_at) VALUES (?, ?, ?, ?, ?)').run(
               client.referred_by, referralReward, 'referral_reward', `مكافأة دعوة (الطلب ${order.order_no})`, now()
             );
          }
        }
      }
    });
    tx();
  } catch (err) {
    console.error('[rewards] Error processing rewards for order', orderId, err);
  }
}
