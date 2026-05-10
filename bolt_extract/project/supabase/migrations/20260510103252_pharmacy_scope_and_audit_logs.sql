/*
  # 薬局スコープと監査ログ

  ## 概要
  - 各薬局はSupabase Authのユーザーアカウントを持つ
  - 監査ログは薬局IDで紐付けられ、他薬局からは参照不可（RLS）
  - 患者フルネームはDBに保存せず、イニシャルのみ記録

  ## テーブル
  1. `pharmacies` - 薬局プロファイル（auth.usersと1:1）
  2. `audit_logs` - チェック履歴（イニシャル・薬剤情報のみ保存）

  ## セキュリティ
  - RLSで自薬局のデータのみ読み書き可能
  - admin（システム管理者）ロールは全薬局閲覧可
*/

-- pharmacies: auth.usersと1:1のプロファイル
CREATE TABLE IF NOT EXISTS pharmacies (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE pharmacies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pharmacy can view own profile"
  ON pharmacies FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Pharmacy can update own profile"
  ON pharmacies FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Pharmacy can insert own profile"
  ON pharmacies FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- audit_logs: 薬局ごとの監査記録（患者フルネーム不保存、イニシャルのみ）
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id uuid NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  patient_initials text NOT NULL DEFAULT '',  -- 例: "Y.T." (山田太郎)
  patient_age text NOT NULL DEFAULT '',
  patient_weight text NOT NULL DEFAULT '',
  drug_count int NOT NULL DEFAULT 0,
  overall_status text NOT NULL DEFAULT 'safe' CHECK (overall_status IN ('safe', 'warning', 'danger')),
  medications jsonb NOT NULL DEFAULT '[]',   -- [{name, dose, frequency, status, notes}]
  checked_at timestamptz DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pharmacy can view own audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (pharmacy_id = auth.uid());

CREATE POLICY "Pharmacy can insert own audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (pharmacy_id = auth.uid());

-- イニシャル変換は後で利用するためのコメント
-- フルネーム "山田 太郎" → initials "Y.T." への変換はフロントエンド側で行う
