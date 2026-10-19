import { Modal } from "./Modal";

type Props = {
	name: string;
	onClose: () => void;
	onConfirm: () => void;
};

export function ConfirmDeleteDialog({ name, onClose, onConfirm }: Props) {
	return (
		<Modal
			title="删除应用"
			subtitle={`确认移除「${name}」？`}
			onClose={onClose}
			width={420}
			footer={
				<>
					<button type="button" className="btn-ghost" onClick={onClose}>
						取消
					</button>
					<button
						type="button"
						className="btn bg-red px-3 text-white hover:bg-red/90"
						onClick={onConfirm}
					>
						删除
					</button>
				</>
			}
		>
			<p className="text-[12px] leading-relaxed text-muted">
				该应用正在运行时会被先停止，配置会从本机删除。项目文件不会受影响。
			</p>
		</Modal>
	);
}
