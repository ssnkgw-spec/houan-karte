import { Bill } from "../schema";
import bousai from "./bousai";
import intelCouncil from "./intel-council";
import kojinJoho from "./kojin-joho";
import kokuminTouhyouKaisei from "./kokumin-touhyou-kaisei";
import reservist from "./reservist";
import seijishikin from "./seijishikin";
import spy from "./spy";

/** トップのカード表示順 */
export const bills: Bill[] = [
  Bill.parse(intelCouncil),
  Bill.parse(reservist),
  Bill.parse(kokuminTouhyouKaisei),
  Bill.parse(kojinJoho),
  Bill.parse(seijishikin),
  Bill.parse(bousai),
  Bill.parse(spy),
];

export function getBill(id: string): Bill {
  const bill = bills.find((b) => b.id === id);
  if (!bill) throw new Error(`unknown bill id: ${id}`);
  return bill;
}
