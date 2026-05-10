/*
  # 薬局設定カラム追加

  ## 変更内容

  ### pharmacies テーブル
  - `default_powder_unit` (text, デフォルト 'g') — 粉薬デフォルト単位
    - 'g': 製剤量(g)で入力する薬局（デフォルト）
    - 'mg': 成分量(mg)で入力する薬局（含量マスタから自動換算）
  
  ## 補足
  - 水薬は常に mL のため設定不要
  - 設定は薬局ごとに独立（pharmacies テーブルの1行に保存）
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pharmacies' AND column_name = 'default_powder_unit'
  ) THEN
    ALTER TABLE pharmacies ADD COLUMN default_powder_unit text NOT NULL DEFAULT 'g'
      CHECK (default_powder_unit IN ('g', 'mg'));
  END IF;
END $$;
