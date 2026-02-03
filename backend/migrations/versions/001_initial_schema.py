"""Initial database schema

Revision ID: 001
Revises:
Create Date: 2026-01-24

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create users table
    op.create_table(
        'users',
        sa.Column('user_id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('email', sa.String(255), unique=True, nullable=False),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('full_name', sa.String(255), nullable=False),
        sa.Column('organization', sa.String(255), nullable=True),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('last_login', sa.DateTime(), nullable=True),
        sa.Column('failed_login_attempts', sa.Integer(), default=0),
        sa.Column('locked_until', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_users_email', 'users', ['email'])

    # Create refresh_tokens table
    op.create_table(
        'refresh_tokens',
        sa.Column('token_id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False),
        sa.Column('token', sa.String(255), unique=True, nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('revoked', sa.Boolean(), default=False),
    )
    op.create_index('ix_refresh_tokens_token', 'refresh_tokens', ['token'])

    # Create cases table
    op.create_table(
        'cases',
        sa.Column('case_id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('uploaded_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False),
        sa.Column('filename', sa.String(255), nullable=False),
        sa.Column('file_path', sa.String(500), nullable=True),
        sa.Column('upload_date', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('raw_text', sa.Text(), nullable=True),
        sa.Column('court_name', sa.String(255), nullable=True),
        sa.Column('case_date', sa.Date(), nullable=True),
        sa.Column('document_type', sa.String(100), nullable=True),
        sa.Column('status', sa.String(50), default='pending'),
        sa.Column('is_deleted', sa.Boolean(), default=False),
        sa.Column('search_vector', postgresql.TSVECTOR(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    op.create_index('ix_cases_uploaded_by', 'cases', ['uploaded_by'])
    op.create_index('ix_cases_uploaded_by_deleted', 'cases', ['uploaded_by', 'is_deleted'])
    op.create_index('ix_cases_search_vector', 'cases', ['search_vector'], postgresql_using='gin')

    # Create entities table
    op.create_table(
        'entities',
        sa.Column('entity_id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('case_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('cases.case_id', ondelete='CASCADE'), nullable=False),
        sa.Column('owner_user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False),
        sa.Column('entity_type', sa.String(50), nullable=False),
        sa.Column('entity_name', sa.String(255), nullable=False),
        sa.Column('normalized_name', sa.String(255), nullable=True),
        sa.Column('confidence_score', sa.Numeric(3, 2), nullable=True),
        sa.Column('page_number', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index('ix_entities_case_id', 'entities', ['case_id'])
    op.create_index('ix_entities_owner_user_id', 'entities', ['owner_user_id'])
    op.create_index('ix_entities_normalized_name', 'entities', ['normalized_name', 'owner_user_id'])

    # Create entity_aliases table
    op.create_table(
        'entity_aliases',
        sa.Column('alias_id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('owner_user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False),
        sa.Column('canonical_name', sa.String(255), nullable=False),
        sa.Column('alias_name', sa.String(255), nullable=False),
        sa.Column('similarity_score', sa.Numeric(5, 2), nullable=True),
        sa.Column('merged_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.user_id'), nullable=True),
        sa.Column('merged_at', sa.DateTime(), server_default=sa.func.now()),
        sa.UniqueConstraint('owner_user_id', 'alias_name', name='uq_entity_aliases_owner_alias'),
    )
    op.create_index('ix_entity_aliases_owner_user_id', 'entity_aliases', ['owner_user_id'])

    # Create analysis_results table
    op.create_table(
        'analysis_results',
        sa.Column('analysis_id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('case_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('cases.case_id', ondelete='CASCADE'), nullable=False),
        sa.Column('owner_user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False),
        sa.Column('triggered_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.user_id'), nullable=True),
        sa.Column('analysis_type', sa.String(50), nullable=False),
        sa.Column('result_text', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index('ix_analysis_results_case_id', 'analysis_results', ['case_id'])
    op.create_index('ix_analysis_results_owner_user_id', 'analysis_results', ['owner_user_id'])

    # Create network_metrics table
    op.create_table(
        'network_metrics',
        sa.Column('metric_id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False),
        sa.Column('entity_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('entities.entity_id', ondelete='CASCADE'), nullable=True),
        sa.Column('metric_type', sa.String(50), nullable=False),
        sa.Column('metric_value', sa.Numeric(10, 6), nullable=False),
        sa.Column('calculated_at', sa.DateTime(), server_default=sa.func.now()),
        sa.UniqueConstraint('user_id', 'entity_id', 'metric_type', name='uq_network_metrics_user_entity_type'),
    )
    op.create_index('ix_network_metrics_user_id', 'network_metrics', ['user_id'])
    op.create_index('ix_network_metrics_entity_id', 'network_metrics', ['entity_id'])

    # Create full-text search trigger for cases
    op.execute("""
        CREATE OR REPLACE FUNCTION update_cases_search_vector()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.search_vector := to_tsvector('english',
                COALESCE(NEW.raw_text, '') || ' ' ||
                COALESCE(NEW.filename, '') || ' ' ||
                COALESCE(NEW.court_name, '')
            );
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)

    op.execute("""
        CREATE TRIGGER cases_search_vector_update
        BEFORE INSERT OR UPDATE ON cases
        FOR EACH ROW EXECUTE FUNCTION update_cases_search_vector();
    """)


def downgrade() -> None:
    # Drop trigger and function
    op.execute("DROP TRIGGER IF EXISTS cases_search_vector_update ON cases;")
    op.execute("DROP FUNCTION IF EXISTS update_cases_search_vector();")

    # Drop tables in reverse order
    op.drop_table('network_metrics')
    op.drop_table('analysis_results')
    op.drop_table('entity_aliases')
    op.drop_table('entities')
    op.drop_table('cases')
    op.drop_table('refresh_tokens')
    op.drop_table('users')
