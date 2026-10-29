import { describe, expect, it } from "vitest";
import { parseItems } from "./parser";
import { formatQty, formatSom, lineTotal, parseQty, parseSom } from "./money";

const flat = (s: string) => s.replace(/\u00a0/g, " ");

describe("pul formati", () => {
  it("so‘mni guruhlaydi", () => {
    expect(flat(formatSom(125000))).toBe("125 000 so‘m");
    expect(flat(formatSom(0))).toBe("0 so‘m");
  });
  it("matndan butun son oladi", () => {
    expect(parseSom("125 000")).toBe(125000);
    expect(parseSom("abc")).toBe(0);
  });
});

describe("miqdor va jami", () => {
  it("o‘nli miqdorni milli sifatida o‘qiydi", () => {
    expect(parseQty("1,5")).toBe(1500);
    expect(parseQty("2")).toBe(2000);
    expect(parseQty("x")).toBeNull();
    expect(formatQty(1500)).toBe("1,5");
  });
  it("floating-point xatosiz hisoblaydi", () => {
    expect(lineTotal(parseQty("0.1")!, 3)).toBe(0);
    expect(lineTotal(parseQty("3")!, 4000)).toBe(12000);
    expect(lineTotal(parseQty("1,5")!, 7990)).toBe(11985);
    expect(lineTotal(parseQty("0,3")!, 10000)).toBe(3000);
  });
});

describe("matn parseri", () => {
  it("asosiy misolni ajratadi", () => {
    const r = parseItems("3 ta non 4000, 2 ta sut 12000");
    expect(r).toHaveLength(2);
    expect(r[0]).toMatchObject({ name: "Non", qty: "3", price: "4000", unit: "dona" });
    expect(r[1]).toMatchObject({ name: "Sut", qty: "2", price: "12000" });
  });
  it("probelli narxni va 'ming' ni tushunadi", () => {
    const r = parseItems("2 ta yog‘ 12 500\n1 kg shakar 14 ming");
    expect(r[0].price).toBe("12500");
    expect(r[1]).toMatchObject({ name: "Shakar", qty: "1", unit: "kg", price: "14000" });
  });
  it("o‘nli miqdorni saqlaydi", () => {
    expect(parseItems("1,5 kg guruch 15000")[0]).toMatchObject({ qty: "1,5", price: "15000", unit: "kg" });
  });
  it("faqat narx bo‘lsa miqdor 1", () => {
    expect(parseItems("non 4000")[0]).toMatchObject({ qty: "1", price: "4000" });
  });
  it("bo‘sh yoki sonsiz matnda qator yo‘q", () => {
    expect(parseItems("")).toEqual([]);
    expect(parseItems("non sut")).toEqual([]);
  });
});
