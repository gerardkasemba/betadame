-- Tontine groups
CREATE TABLE tontine_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  target_amount DECIMAL(12,2) NOT NULL,
  contribution_amount DECIMAL(10,2) NOT NULL,
  duration_weeks INTEGER NOT NULL,
  payment_schedule VARCHAR(50) NOT NULL CHECK (payment_schedule IN ('weekly', 'bi-weekly', 'monthly')),
  created_by UUID NOT NULL REFERENCES profiles(id),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tontine members
CREATE TABLE tontine_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tontine_group_id UUID NOT NULL REFERENCES tontine_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  position INTEGER NOT NULL, -- Payout order position
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'left', 'removed')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ
);

-- Tontine cycles (each payment period)
CREATE TABLE tontine_cycles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tontine_group_id UUID NOT NULL REFERENCES tontine_groups(id) ON DELETE CASCADE,
  cycle_number INTEGER NOT NULL,
  due_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tontine contributions
CREATE TABLE tontine_contributions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tontine_group_id UUID NOT NULL REFERENCES tontine_groups(id) ON DELETE CASCADE,
  cycle_id UUID NOT NULL REFERENCES tontine_cycles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'missed')),
  paid_at TIMESTAMPTZ,
  transaction_id UUID REFERENCES transactions(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tontine payouts
CREATE TABLE tontine_payouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tontine_group_id UUID NOT NULL REFERENCES tontine_groups(id) ON DELETE CASCADE,
  cycle_id UUID NOT NULL REFERENCES tontine_cycles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES profiles(id),
  amount DECIMAL(12,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  paid_at TIMESTAMPTZ,
  transaction_id UUID REFERENCES transactions(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tontine invitations
CREATE TABLE tontine_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tontine_group_id UUID NOT NULL REFERENCES tontine_groups(id) ON DELETE CASCADE,
  phone_number VARCHAR(20) NOT NULL,
  invited_by UUID NOT NULL REFERENCES profiles(id),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_tontine_members_group ON tontine_members(tontine_group_id);
CREATE INDEX idx_tontine_members_user ON tontine_members(user_id);
CREATE INDEX idx_tontine_cycles_group ON tontine_cycles(tontine_group_id);
CREATE INDEX idx_tontine_contributions_cycle ON tontine_contributions(cycle_id);
CREATE INDEX idx_tontine_contributions_user ON tontine_contributions(user_id);
CREATE INDEX idx_tontine_invitations_phone ON tontine_invitations(phone_number);