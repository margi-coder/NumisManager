from typing import List, Dict, Any

def calculate_hpp_single(harga: float, ongkir: float, qty: int) -> Dict[str, float]:
    """
    Menghitung HPP total dan HPP per pcs untuk satu item koleksi.
    hpp = harga + ongkir
    hpp_per_pcs = hpp / qty
    """
    harga_val = float(harga or 0.0)
    ongkir_val = float(ongkir or 0.0)
    qty_val = int(qty or 1)
    if qty_val <= 0:
        qty_val = 1

    hpp = round(harga_val + ongkir_val, 2)
    hpp_per_pcs = round(hpp / qty_val, 2)

    return {
        "hpp": hpp,
        "hpp_per_pcs": hpp_per_pcs
    }

def calculate_hpp_batch(items: List[Dict[str, Any]], total_ongkir: float) -> List[Dict[str, Any]]:
    """
    Menghitung HPP untuk kumpulan item dalam batch.
    Ongkir dibagi RATA per item koleksi (equal split, bukan proporsional).
    Contoh: 2 items, ongkir 2000 -> masing-masing item dapat ongkir 1000.
    """
    total_ongkir_val = float(total_ongkir or 0.0)
    num_items = len(items)
    if num_items == 0:
        return []

    ongkir_per_item = round(total_ongkir_val / num_items, 2)
    updated_items = []

    for item in items:
        item_dict = dict(item)
        harga = float(item_dict.get("harga", 0.0) or 0.0)
        qty = int(item_dict.get("qty", 1) or 1)
        if qty <= 0:
            qty = 1

        hpp = round(harga + ongkir_per_item, 2)
        hpp_per_pcs = round(hpp / qty, 2)

        item_dict["ongkir"] = ongkir_per_item
        item_dict["hpp"] = hpp
        item_dict["hpp_per_pcs"] = hpp_per_pcs
        updated_items.append(item_dict)

    return updated_items

def calculate_profit(harga_jual_pcs: float, hpp_pcs: float, qty: int) -> Dict[str, float]:
    """
    Menghitung komponen profit dan margin penjualan.
    profit_pcs = harga_jual_pcs - hpp_pcs
    total_jual = harga_jual_pcs * qty
    total_profit = profit_pcs * qty
    margin_pct = (profit_pcs / harga_jual_pcs) * 100
    """
    harga_jual_val = float(harga_jual_pcs or 0.0)
    hpp_val = float(hpp_pcs or 0.0)
    qty_val = int(qty or 1)

    profit_pcs = round(harga_jual_val - hpp_val, 2)
    total_jual = round(harga_jual_val * qty_val, 2)
    total_profit = round(profit_pcs * qty_val, 2)
    margin_pct = round((profit_pcs / harga_jual_val * 100.0), 2) if harga_jual_val > 0 else 0.0

    return {
        "profit_pcs": profit_pcs,
        "total_jual": total_jual,
        "total_profit": total_profit,
        "margin_pct": margin_pct
    }
