/*
  # 薬剤マスタテーブル作成

  ## 概要
  小児科処方で頻用される薬剤のマスタテーブル。
  YJコードを持つ薬剤はPMDA公式リダイレクトURLで添付文書に直接アクセスできる。
  小児用量データをキャッシュすることで、患者体重入力後に即時用量チェックが可能。

  ## テーブル: drug_master
  - id: UUID主キー
  - name: 薬剤名（販売名・一般名の両方で検索できるよう複数行登録可）
  - name_kana: 読み仮名（検索用）
  - yj_code: YJコード 14桁（例: 6113001F1038）。あれば直接リダイレクトURLに使用
  - pmda_pdf_url: 添付文書PDFの直URL（YJコードがない場合のフォールバック）
  - category: 薬効分類（抗菌薬/解熱鎮痛/去痰/抗アレルギー等）
  - dose_per_kg_min: 1回または1日あたりの最小用量 (mg/kg)
  - dose_per_kg_max: 1回または1日あたりの最大用量 (mg/kg)
  - dose_unit: 用量の単位（mg/kg/日, mg/kg/回 等）
  - dose_frequency: 標準用法（例: 1日3回 食後）
  - dose_max_single: 単回最大投与量 (mg) — 体重に関係なく上限
  - dose_notes: 用量に関する注意事項（年齢制限・禁忌等）
  - age_min_months: 投与可能な最低月齢（0=新生児から可）
  - age_max_years: 投与可能な最大年齢（例: 15）
  - warnings: 小児特有の注意事項
  - created_at: 作成日時

  ## セキュリティ
  - RLS有効
  - ログイン済みユーザーは全員参照可能（マスタデータのため）
  - 書き込みはサービスロール(管理者)のみ
*/

CREATE TABLE IF NOT EXISTS drug_master (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_kana text DEFAULT '',
  yj_code text DEFAULT '',
  pmda_pdf_url text DEFAULT '',
  category text NOT NULL DEFAULT '',
  dose_per_kg_min numeric,
  dose_per_kg_max numeric,
  dose_unit text DEFAULT 'mg/kg/日',
  dose_frequency text DEFAULT '',
  dose_max_single numeric,
  dose_notes text DEFAULT '',
  age_min_months integer DEFAULT 0,
  age_max_years integer DEFAULT 15,
  warnings text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS drug_master_name_idx ON drug_master USING gin(to_tsvector('simple', name));
CREATE INDEX IF NOT EXISTS drug_master_yj_code_idx ON drug_master (yj_code) WHERE yj_code <> '';

ALTER TABLE drug_master ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read drug master"
  ON drug_master FOR SELECT
  TO authenticated
  USING (true);
